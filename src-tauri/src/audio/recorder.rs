use crate::audio::detector::MeetingDetector;
use crate::audio::mic::MicRecorder;
use crate::audio::system_audio::SystemAudioRecorder;
use crate::audio::{
    recording_cache_dir, system_audio_supported, write_wav_f32, AudioPermissions, TARGET_SAMPLE_RATE,
};
use block::ConcreteBlock;
use objc::runtime::Object;
use objc::{class, msg_send, sel, sel_impl};
use std::sync::mpsc;
use serde::Serialize;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RecordingStatus {
    Idle,
    Detecting,
    Recording,
}

#[derive(Debug, Clone, Serialize)]
pub struct RecordingResult {
    pub path: String,
}

#[derive(Debug, Clone, Serialize)]
struct RecordingReadyPayload {
    path: String,
}

#[derive(Debug, Clone, Serialize)]
struct RecordingProgressPayload {
    elapsed_seconds: u64,
}

pub struct AudioManager {
    detector: MeetingDetector,
    mic: MicRecorder,
    system_audio: SystemAudioRecorder,
    recording_started_at: Mutex<Option<Instant>>,
    progress_thread: Mutex<Option<JoinHandle<()>>>,
    progress_running: Arc<AtomicU64>,
}

impl AudioManager {
    pub fn new() -> Self {
        Self {
            detector: MeetingDetector::new(),
            mic: MicRecorder::new(),
            system_audio: SystemAudioRecorder::new(),
            recording_started_at: Mutex::new(None),
            progress_thread: Mutex::new(None),
            progress_running: Arc::new(AtomicU64::new(0)),
        }
    }

    pub fn start_meeting_detection(&mut self, app: AppHandle) -> Result<(), String> {
        self.detector.start(app)
    }

    pub fn stop_meeting_detection(&mut self) -> Result<(), String> {
        self.detector.stop()
    }

    pub fn start_recording(&mut self, app: AppHandle, pid: Option<u32>) -> Result<(), String> {
        if self.mic.is_recording() {
            return Err("Recording is already in progress.".into());
        }

        self.mic.start()?;

        let target_pid = pid.or_else(|| self.detector.active_pid());
        let mut system_started = false;
        if let Some(pid) = target_pid {
            if system_audio_supported() {
                match self.system_audio.start(pid) {
                    Ok(()) => system_started = true,
                    Err(error) => eprintln!("system audio unavailable, continuing mic-only: {error}"),
                }
            }
        }

        *self.recording_started_at.lock().map_err(|e| e.to_string())? = Some(Instant::now());
        self.start_progress_thread(app, system_started);
        Ok(())
    }

    pub fn stop_recording(&mut self, app: AppHandle) -> Result<RecordingResult, String> {
        self.stop_progress_thread();

        let mic_samples = self.mic.stop()?;
        let system_samples = self.system_audio.stop()?;

        let cache_dir = recording_cache_dir(&app)?;
        std::fs::create_dir_all(&cache_dir).map_err(|e| e.to_string())?;
        let stamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis();

        let mixed = mix_samples(&mic_samples, &system_samples);
        let mixed_path = cache_dir.join(format!("meeting-{stamp}.wav"));
        write_wav_f32(&mixed_path, &mixed, TARGET_SAMPLE_RATE)?;

        let result = RecordingResult {
            path: mixed_path.to_string_lossy().into_owned(),
        };

        let payload = RecordingReadyPayload {
            path: result.path.clone(),
        };
        let _ = app.emit("recording-ready", payload);

        *self.recording_started_at.lock().map_err(|e| e.to_string())? = None;
        Ok(result)
    }

    pub fn get_recording_status(&self) -> RecordingStatus {
        if self.mic.is_recording() {
            RecordingStatus::Recording
        } else if self.detector.is_running() {
            RecordingStatus::Detecting
        } else {
            RecordingStatus::Idle
        }
    }

    pub fn check_audio_permissions(&self) -> AudioPermissions {
        AudioPermissions {
            microphone: microphone_permission_granted(),
            system_audio: system_audio_supported() && self.system_audio.permission_granted(),
        }
    }

    pub fn request_microphone_permission(&mut self, _app: AppHandle) -> Result<bool, String> {
        request_microphone_permission()
    }

    pub fn request_system_audio_permission(&mut self, app: AppHandle) -> Result<bool, String> {
        if !system_audio_supported() {
            return Ok(false);
        }

        let pid = self.detector.active_pid().unwrap_or_else(|| std::process::id());
        match self.system_audio.start(pid) {
            Ok(()) => {
                thread::sleep(Duration::from_millis(250));
                let _ = self.system_audio.stop();
                Ok(self.system_audio.permission_granted())
            }
            Err(error) => {
                eprintln!("system audio permission request failed: {error}");
                let _ = app;
                Ok(false)
            }
        }
    }

    fn start_progress_thread(&mut self, app: AppHandle, _system_started: bool) {
        self.stop_progress_thread();
        self.progress_running.store(1, Ordering::SeqCst);
        let running = Arc::clone(&self.progress_running);

        let handle = thread::Builder::new()
            .name("recording-progress".into())
            .spawn(move || {
                let mut seconds = 0u64;
                while running.load(Ordering::SeqCst) != 0 {
                    thread::sleep(Duration::from_secs(1));
                    if running.load(Ordering::SeqCst) == 0 {
                        break;
                    }
                    seconds += 1;
                    let _ = app.emit(
                        "recording-progress",
                        RecordingProgressPayload { elapsed_seconds: seconds },
                    );
                }
            })
            .ok();

        if let Ok(mut thread) = self.progress_thread.lock() {
            *thread = handle;
        }
    }

    fn stop_progress_thread(&mut self) {
        self.progress_running.store(0, Ordering::SeqCst);
        if let Ok(mut thread) = self.progress_thread.lock() {
            if let Some(handle) = thread.take() {
                let _ = handle.join();
            }
        }
    }
}

#[link(name = "AVFoundation", kind = "framework")]
extern "C" {
    static AVMediaTypeAudio: *mut Object;
}

// AVAuthorizationStatusAuthorized
const AV_AUTHORIZATION_STATUS_AUTHORIZED: i32 = 3;

fn av_media_type_audio() -> *mut Object {
    unsafe { AVMediaTypeAudio }
}

fn microphone_permission_granted() -> bool {
    unsafe {
        let media_type = av_media_type_audio();
        if media_type.is_null() {
            eprintln!("AVMediaTypeAudio unavailable");
            return false;
        }

        let status: i32 =
            msg_send![class!(AVCaptureDevice), authorizationStatusForMediaType: media_type];
        status == AV_AUTHORIZATION_STATUS_AUTHORIZED
    }
}

fn mix_samples(a: &[f32], b: &[f32]) -> Vec<f32> {
    if b.is_empty() {
        return a.to_vec();
    }
    if a.is_empty() {
        return b.to_vec();
    }
    let len = a.len().max(b.len());
    let mut out = Vec::with_capacity(len);
    for i in 0..len {
        let sa = if i < a.len() { a[i] } else { 0.0 };
        let sb = if i < b.len() { b[i] } else { 0.0 };
        out.push((sa + sb).clamp(-1.0, 1.0));
    }
    out
}

fn request_microphone_permission() -> Result<bool, String> {
    if microphone_permission_granted() {
        return Ok(true);
    }

    let (tx, rx) = mpsc::channel();
    unsafe {
        let media_type = av_media_type_audio();
        let block = ConcreteBlock::new(move |granted: bool| {
            let _ = tx.send(granted);
        });
        let block = block.copy();
        let _: () = msg_send![class!(AVCaptureDevice), requestAccessForMediaType: media_type completionHandler: &*block];
    }

    rx.recv()
        .map_err(|_| "Microphone permission request did not complete.".to_string())
}

