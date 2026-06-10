use crate::audio::{mix_to_mono_interleaved, resample_mono, TARGET_SAMPLE_RATE};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{SampleFormat, StreamConfig};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};

pub struct MicRecorder {
    running: Arc<AtomicBool>,
    samples: Arc<Mutex<Vec<f32>>>,
    thread: Mutex<Option<JoinHandle<()>>>,
}

impl MicRecorder {
    pub fn new() -> Self {
        Self {
            running: Arc::new(AtomicBool::new(false)),
            samples: Arc::new(Mutex::new(Vec::new())),
            thread: Mutex::new(None),
        }
    }

    pub fn is_recording(&self) -> bool {
        self.running.load(Ordering::SeqCst)
    }

    pub fn start(&self) -> Result<(), String> {
        if self.running.swap(true, Ordering::SeqCst) {
            return Ok(());
        }

        if let Ok(mut samples) = self.samples.lock() {
            samples.clear();
        }

        let running = Arc::clone(&self.running);
        let samples = Arc::clone(&self.samples);
        let running_for_error = Arc::clone(&self.running);
        let handle = thread::Builder::new()
            .name("mic-recorder".into())
            .spawn(move || capture_loop(running, samples))
            .map_err(|e| {
                running_for_error.store(false, Ordering::SeqCst);
                e.to_string()
            })?;

        *self.thread.lock().map_err(|e| e.to_string())? = Some(handle);
        Ok(())
    }

    pub fn stop(&self) -> Result<Vec<f32>, String> {
        if !self.running.swap(false, Ordering::SeqCst) {
            return Ok(Vec::new());
        }

        if let Some(handle) = self.thread.lock().map_err(|e| e.to_string())?.take() {
            let _ = handle.join();
        }

        let samples = self
            .samples
            .lock()
            .map_err(|e| e.to_string())?
            .clone();
        Ok(samples)
    }
}

fn capture_loop(running: Arc<AtomicBool>, samples: Arc<Mutex<Vec<f32>>>) {
    let result = run_capture(running.clone(), samples.clone());
    running.store(false, Ordering::SeqCst);
    if let Err(error) = result {
        eprintln!("microphone capture error: {error}");
    }
}

fn run_capture(running: Arc<AtomicBool>, samples: Arc<Mutex<Vec<f32>>>) -> Result<(), String> {
    let host = cpal::default_host();
    let device = host
        .default_input_device()
        .ok_or_else(|| "No default input device available.".to_string())?;

    let supported = device
        .default_input_config()
        .map_err(|e| format!("Failed to read input config: {e}"))?;

    let input_rate = supported.sample_rate().0;
    let channels = supported.channels();
    let sample_format = supported.sample_format();

    let stream_config = StreamConfig {
        channels,
        sample_rate: supported.sample_rate(),
        buffer_size: cpal::BufferSize::Default,
    };

    let samples_capture = Arc::clone(&samples);
    let err_fn = |err| eprintln!("microphone stream error: {err}");

    let stream = match sample_format {
        SampleFormat::F32 => device.build_input_stream(
            &stream_config,
            move |data: &[f32], _| append_samples(&samples_capture, data, channels, input_rate),
            err_fn,
            None,
        ),
        SampleFormat::I16 => device.build_input_stream(
            &stream_config,
            move |data: &[i16], _| {
                let converted: Vec<f32> = data
                    .iter()
                    .map(|sample| *sample as f32 / i16::MAX as f32)
                    .collect();
                append_samples(&samples_capture, &converted, channels, input_rate);
            },
            err_fn,
            None,
        ),
        SampleFormat::U16 => device.build_input_stream(
            &stream_config,
            move |data: &[u16], _| {
                let converted: Vec<f32> = data
                    .iter()
                    .map(|sample| (*sample as f32 / u16::MAX as f32) * 2.0 - 1.0)
                    .collect();
                append_samples(&samples_capture, &converted, channels, input_rate);
            },
            err_fn,
            None,
        ),
        other => {
            return Err(format!("Unsupported microphone sample format: {other:?}"));
        }
    }
    .map_err(|e| format!("Failed to build microphone stream: {e}"))?;

    stream.play().map_err(|e| format!("Failed to start microphone stream: {e}"))?;

    while running.load(Ordering::SeqCst) {
        thread::sleep(std::time::Duration::from_millis(50));
    }

    drop(stream);
    Ok(())
}

fn append_samples(
    samples: &Arc<Mutex<Vec<f32>>>,
    data: &[f32],
    channels: u16,
    input_rate: u32,
) {
    let mono = mix_to_mono_interleaved(data, channels);
    let resampled = resample_mono(&mono, input_rate, TARGET_SAMPLE_RATE);
    if let Ok(mut buffer) = samples.lock() {
        buffer.extend_from_slice(&resampled);
    }
}
