use crate::audio::system_audio_supported;
use coreaudio_sys::*;
use serde::Serialize;
use std::ffi::CStr;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

const POLL_INTERVAL: Duration = Duration::from_millis(300);
const SUSTAINED_ACTIVITY: Duration = Duration::from_secs(2);
const STATUS_EMIT_INTERVAL: Duration = Duration::from_secs(5);

const KNOWN_MEETING_BUNDLE_IDS: &[&str] = &[
    "com.google.Chrome",
    "com.microsoft.teams",
    "us.zoom.xos",
    "com.cisco.webex",
    "com.apple.facetime",
    "com.microsoft.teams2",
    "com.brave.Browser",
    "org.mozilla.firefox",
];

#[derive(Debug, Clone, Serialize)]
pub struct MeetingDetectedPayload {
    pub process_name: String,
    pub pid: u32,
}

#[derive(Serialize, Clone)]
struct DetectorStatusPayload {
    processes: Vec<ProcessStatus>,
}

#[derive(Serialize, Clone)]
struct ProcessStatus {
    name: String,
    pid: u32,
    has_input: bool,
    has_output: bool,
}

struct ActiveMeeting {
    pid: u32,
    name: String,
    first_seen: Instant,
    notified: bool,
}

pub struct MeetingDetector {
    running: Arc<AtomicBool>,
    thread: Mutex<Option<JoinHandle<()>>>,
    active_meeting: Arc<Mutex<Option<ActiveMeeting>>>,
}

impl MeetingDetector {
    pub fn new() -> Self {
        Self {
            running: Arc::new(AtomicBool::new(false)),
            thread: Mutex::new(None),
            active_meeting: Arc::new(Mutex::new(None)),
        }
    }

    pub fn is_running(&self) -> bool {
        self.running.load(Ordering::SeqCst)
    }

    pub fn active_pid(&self) -> Option<u32> {
        self.active_meeting
            .lock()
            .ok()
            .and_then(|active| active.as_ref().map(|meeting| meeting.pid))
    }

    pub fn start(&self, app: AppHandle) -> Result<(), String> {
        if self.running.swap(true, Ordering::SeqCst) {
            return Ok(());
        }

        let running = Arc::clone(&self.running);
        let active_meeting = Arc::clone(&self.active_meeting);
        let handle = thread::Builder::new()
            .name("meeting-detector".into())
            .spawn(move || detector_loop(app, running, active_meeting))
            .map_err(|e| e.to_string())?;

        *self.thread.lock().map_err(|e| e.to_string())? = Some(handle);
        Ok(())
    }

    pub fn stop(&self) -> Result<(), String> {
        if !self.running.swap(false, Ordering::SeqCst) {
            return Ok(());
        }

        if let Some(handle) = self.thread.lock().map_err(|e| e.to_string())?.take() {
            let _ = handle.join();
        }

        *self.active_meeting.lock().map_err(|e| e.to_string())? = None;
        Ok(())
    }
}

fn detector_loop(app: AppHandle, running: Arc<AtomicBool>, active_meeting: Arc<Mutex<Option<ActiveMeeting>>>) {
    let own_pid = std::process::id();
    let mut last_status_emit = Instant::now();

    while running.load(Ordering::SeqCst) {
        if last_status_emit.elapsed() >= STATUS_EMIT_INTERVAL {
            let processes = collect_process_statuses(own_pid);
            let _ = app.emit(
                "meeting-detector-status",
                DetectorStatusPayload { processes },
            );
            last_status_emit = Instant::now();
        }

        let candidate = find_meeting_candidate(own_pid);

        let mut active = match active_meeting.lock() {
            Ok(guard) => guard,
            Err(_) => break,
        };

        match (candidate, active.as_ref()) {
            (Some((pid, _name)), Some(current)) if current.pid == pid => {
                if !current.notified && current.first_seen.elapsed() >= SUSTAINED_ACTIVITY {
                    let payload = MeetingDetectedPayload {
                        process_name: current.name.clone(),
                        pid: current.pid,
                    };
                    let _ = app.emit("meeting-detected", payload);
                    if let Some(meeting) = active.as_mut() {
                        meeting.notified = true;
                    }
                }
            }
            (Some((pid, name)), _) => {
                *active = Some(ActiveMeeting {
                    pid,
                    name,
                    first_seen: Instant::now(),
                    notified: false,
                });
            }
            (None, Some(_)) => {
                let _ = app.emit("meeting-ended", ());
                *active = None;
            }
            (None, None) => {}
        }

        drop(active);
        thread::sleep(POLL_INTERVAL);
    }
}

fn find_meeting_candidate(own_pid: u32) -> Option<(u32, String)> {
    let process_ids = get_process_object_ids()?;

    for process_id in process_ids {
        let pid = get_process_pid(process_id)?;
        if pid == own_pid {
            continue;
        }

        let bundle_id = get_process_name(process_id).unwrap_or_else(|| format!("pid-{pid}"));
        if should_skip_process(&bundle_id, pid) {
            continue;
        }

        if process_has_sustained_audio(process_id, &bundle_id) {
            return Some((pid, friendly_process_name(&bundle_id)));
        }
    }

    None
}

fn collect_process_statuses(own_pid: u32) -> Vec<ProcessStatus> {
    let Some(process_ids) = get_process_object_ids() else {
        return Vec::new();
    };

    let mut statuses = Vec::new();
    for process_id in process_ids {
        let Some(pid) = get_process_pid(process_id) else {
            continue;
        };
        if pid == own_pid {
            continue;
        }

        let name = get_process_name(process_id).unwrap_or_else(|| format!("pid-{pid}"));
        if should_skip_process(&name, pid) {
            continue;
        }

        statuses.push(ProcessStatus {
            name,
            pid,
            has_input: is_process_property_true(process_id, kAudioProcessPropertyIsRunningInput),
            has_output: is_process_property_true(process_id, kAudioProcessPropertyIsRunningOutput),
        });
    }

    statuses
}

fn is_known_meeting_app(bundle_id: &str) -> bool {
    KNOWN_MEETING_BUNDLE_IDS.contains(&bundle_id)
}

fn friendly_process_name(bundle_id: &str) -> String {
    match bundle_id {
        "com.google.Chrome" => "Google Meet".into(),
        "us.zoom.xos" => "Zoom".into(),
        "com.microsoft.teams" | "com.microsoft.teams2" => "Microsoft Teams".into(),
        "com.cisco.webex" => "Webex".into(),
        "com.apple.facetime" => "FaceTime".into(),
        _ => bundle_id.to_owned(),
    }
}

fn get_process_object_ids() -> Option<Vec<AudioObjectID>> {
    unsafe {
        let system_object = kAudioObjectSystemObject;
        let property_address = AudioObjectPropertyAddress {
            mSelector: kAudioHardwarePropertyProcessObjectList,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain,
        };

        let mut data_size = 0u32;
        let status = AudioObjectGetPropertyDataSize(
            system_object,
            &property_address,
            0,
            std::ptr::null(),
            &mut data_size,
        );
        if status != 0 || data_size == 0 {
            return None;
        }

        let count = data_size as usize / std::mem::size_of::<AudioObjectID>();
        let mut process_ids = vec![0u32; count];
        let status = AudioObjectGetPropertyData(
            system_object,
            &property_address,
            0,
            std::ptr::null(),
            &mut data_size,
            process_ids.as_mut_ptr() as *mut _,
        );
        if status != 0 {
            return None;
        }

        Some(process_ids)
    }
}

fn get_process_pid(process_id: AudioObjectID) -> Option<u32> {
    unsafe {
        let property_address = AudioObjectPropertyAddress {
            mSelector: kAudioProcessPropertyPID,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain,
        };
        let mut pid = 0i32;
        let mut data_size = std::mem::size_of::<i32>() as u32;
        let status = AudioObjectGetPropertyData(
            process_id,
            &property_address,
            0,
            std::ptr::null(),
            &mut data_size,
            &mut pid as *mut _ as *mut _,
        );
        if status != 0 || pid <= 0 {
            return None;
        }
        Some(pid as u32)
    }
}

fn get_process_name(process_id: AudioObjectID) -> Option<String> {
    unsafe {
        let property_address = AudioObjectPropertyAddress {
            mSelector: kAudioProcessPropertyBundleID,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain,
        };

        let mut cf_string: CFStringRef = std::ptr::null();
        let mut data_size = std::mem::size_of::<CFStringRef>() as u32;
        let status = AudioObjectGetPropertyData(
            process_id,
            &property_address,
            0,
            std::ptr::null(),
            &mut data_size,
            &mut cf_string as *mut _ as *mut _,
        );
        if status != 0 || cf_string.is_null() {
            return None;
        }

        let c_string = CFStringGetCStringPtr(cf_string, kCFStringEncodingUTF8);
        if !c_string.is_null() {
            return CStr::from_ptr(c_string).to_str().ok().map(str::to_owned);
        }

        let mut buffer = [0i8; 512];
        if CFStringGetCString(
            cf_string,
            buffer.as_mut_ptr(),
            buffer.len() as i64,
            kCFStringEncodingUTF8,
        ) != 0
        {
            return CStr::from_ptr(buffer.as_ptr())
                .to_str()
                .ok()
                .map(str::to_owned);
        }

        None
    }
}

fn process_has_sustained_audio(process_id: AudioObjectID, bundle_id: &str) -> bool {
    let has_input = is_process_property_true(process_id, kAudioProcessPropertyIsRunningInput);
    let has_output = is_process_property_true(process_id, kAudioProcessPropertyIsRunningOutput);

    if is_known_meeting_app(bundle_id) {
        has_input
    } else {
        has_input && has_output
    }
}

fn is_process_property_true(process_id: AudioObjectID, selector: u32) -> bool {
    unsafe {
        let property_address = AudioObjectPropertyAddress {
            mSelector: selector,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain,
        };
        let mut value = 0u32;
        let mut data_size = std::mem::size_of::<u32>() as u32;
        let status = AudioObjectGetPropertyData(
            process_id,
            &property_address,
            0,
            std::ptr::null(),
            &mut data_size,
            &mut value as *mut _ as *mut _,
        );
        status == 0 && value != 0
    }
}

fn should_skip_process(name: &str, pid: u32) -> bool {
    let lowered = name.to_ascii_lowercase();
    if lowered.contains("replayd") || lowered.contains("coreaudiod") {
        return true;
    }

    // Skip obvious system helpers even when bundle IDs are opaque.
    if pid <= 1 {
        return true;
    }

    let _ = system_audio_supported();
    false
}
