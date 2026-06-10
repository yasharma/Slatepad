use crate::audio::{mix_to_mono_interleaved, resample_mono, system_audio_supported, TARGET_SAMPLE_RATE};
use coreaudio_sys::*;
use objc::runtime::{Class, Object};
use objc::{class, msg_send, sel, sel_impl};
use std::ffi::CString;
use std::os::raw::c_void;
use std::ptr;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};

#[link(name = "CoreAudio", kind = "framework")]
extern "C" {
    fn AudioHardwareCreateProcessTap(
        in_description: *mut Object,
        out_tap_id: *mut AudioObjectID,
    ) -> OSStatus;
    fn AudioHardwareDestroyProcessTap(in_tap_id: AudioObjectID) -> OSStatus;
}

pub struct SystemAudioRecorder {
    running: Arc<AtomicBool>,
    samples: Arc<Mutex<Vec<f32>>>,
    thread: Mutex<Option<JoinHandle<()>>>,
    permission_granted: Arc<AtomicBool>,
}

impl SystemAudioRecorder {
    pub fn new() -> Self {
        Self {
            running: Arc::new(AtomicBool::new(false)),
            samples: Arc::new(Mutex::new(Vec::new())),
            thread: Mutex::new(None),
            permission_granted: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn permission_granted(&self) -> bool {
        self.permission_granted.load(Ordering::SeqCst)
    }

    pub fn is_recording(&self) -> bool {
        self.running.load(Ordering::SeqCst)
    }

    pub fn start(&self, pid: u32) -> Result<(), String> {
        if !system_audio_supported() {
            return Err("System audio capture requires macOS 14.2 or later.".into());
        }

        if self.running.swap(true, Ordering::SeqCst) {
            return Ok(());
        }

        if let Ok(mut samples) = self.samples.lock() {
            samples.clear();
        }

        let running = Arc::clone(&self.running);
        let samples = Arc::clone(&self.samples);
        let permission_granted = Arc::clone(&self.permission_granted);
        let running_for_error = Arc::clone(&self.running);
        let handle = thread::Builder::new()
            .name("system-audio-recorder".into())
            .spawn(move || capture_loop(pid, running, samples, permission_granted))
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

        self.samples
            .lock()
            .map(|samples| samples.clone())
            .map_err(|e| e.to_string())
    }

    pub fn probe_permission(&self) -> Result<bool, String> {
        if !system_audio_supported() {
            return Ok(false);
        }

        if self.permission_granted.load(Ordering::SeqCst) {
            return Ok(true);
        }

        let own_pid = std::process::id();
        match setup_tap_capture(own_pid, Arc::clone(&self.samples)) {
            Ok(capture) => {
                cleanup_capture(capture);
                self.permission_granted.store(true, Ordering::SeqCst);
                Ok(true)
            }
            Err(error) => {
                if error.contains("permission") || error.contains("1741") {
                    Ok(false)
                } else {
                    Ok(false)
                }
            }
        }
    }
}

fn capture_loop(
    pid: u32,
    running: Arc<AtomicBool>,
    samples: Arc<Mutex<Vec<f32>>>,
    permission_granted: Arc<AtomicBool>,
) {
    let result = run_capture(pid, running.clone(), samples, permission_granted.clone());
    running.store(false, Ordering::SeqCst);
    match result {
        Ok(()) => permission_granted.store(true, Ordering::SeqCst),
        Err(error) => eprintln!("system audio capture error: {error}"),
    }
}

struct TapCapture {
    tap_id: AudioObjectID,
    aggregate_device_id: AudioObjectID,
    io_proc_id: AudioDeviceIOProcID,
    capture_state: Box<CaptureState>,
}

struct CaptureState {
    samples: Arc<Mutex<Vec<f32>>>,
    input_rate: u32,
    channels: u16,
}

fn run_capture(
    pid: u32,
    running: Arc<AtomicBool>,
    samples: Arc<Mutex<Vec<f32>>>,
    permission_granted: Arc<AtomicBool>,
) -> Result<(), String> {
    let capture = setup_tap_capture(pid, samples)?;
    permission_granted.store(true, Ordering::SeqCst);

    while running.load(Ordering::SeqCst) {
        thread::sleep(std::time::Duration::from_millis(50));
    }

    cleanup_capture(capture);
    Ok(())
}

fn setup_tap_capture(pid: u32, samples: Arc<Mutex<Vec<f32>>>) -> Result<TapCapture, String> {
    let process_object_id = translate_pid_to_process_object(pid)?;

    let tap_description = create_tap_description(process_object_id)?;
    let tap_id = create_process_tap(tap_description)?;
    let tap_uid = read_tap_uid(tap_id)?;
    let (input_rate, channels) = read_tap_format(tap_id)?;

    let aggregate_device_id = create_aggregate_device(&tap_uid)?;
    let capture_state = Box::new(CaptureState {
        samples,
        input_rate,
        channels,
    });

    let io_proc_id = register_io_proc(aggregate_device_id, &capture_state)?;

    unsafe {
        let status = AudioDeviceStart(aggregate_device_id, io_proc_id);
        if status != 0 {
            unregister_io_proc(aggregate_device_id, io_proc_id);
            destroy_aggregate_device(aggregate_device_id);
            destroy_process_tap(tap_id);
            return Err(format!("Failed to start aggregate device: status {status}"));
        }
    }

    Ok(TapCapture {
        tap_id,
        aggregate_device_id,
        io_proc_id,
        capture_state,
    })
}

fn cleanup_capture(capture: TapCapture) {
    unsafe {
        let _ = AudioDeviceStop(capture.aggregate_device_id, capture.io_proc_id);
    }
    unregister_io_proc(capture.aggregate_device_id, capture.io_proc_id);
    destroy_aggregate_device(capture.aggregate_device_id);
    destroy_process_tap(capture.tap_id);
    drop(capture.capture_state);
}

fn translate_pid_to_process_object(pid: u32) -> Result<AudioObjectID, String> {
    unsafe {
        let mut process_object_id = kAudioObjectUnknown;
        let mut data_size = std::mem::size_of::<AudioObjectID>() as u32;
        let pid_i32 = pid as i32;
        let property_address = AudioObjectPropertyAddress {
            mSelector: kAudioHardwarePropertyTranslatePIDToProcessObject,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain,
        };

        let status = AudioObjectGetPropertyData(
            kAudioObjectSystemObject,
            &property_address,
            std::mem::size_of::<i32>() as u32,
            &pid_i32 as *const _ as *const c_void,
            &mut data_size,
            &mut process_object_id as *mut _ as *mut _,
        );

        if status != 0 || process_object_id == kAudioObjectUnknown {
            return Err(format!(
                "Failed to translate PID {pid} to CoreAudio process object (status {status})"
            ));
        }

        Ok(process_object_id)
    }
}

fn create_tap_description(process_object_id: AudioObjectID) -> Result<*mut Object, String> {
    unsafe {
        let cls = Class::get("CATapDescription").ok_or_else(|| {
            "CATapDescription class unavailable — requires macOS 14.2+".to_string()
        })?;

        let process_number: *mut Object = msg_send![
            class!(NSNumber),
            numberWithUnsignedInt: process_object_id
        ];
        let processes: *mut Object = msg_send![class!(NSArray), arrayWithObject: process_number];

        let description: *mut Object = msg_send![cls, alloc];
        let description: *mut Object =
            msg_send![description, initMonoMixdownOfProcesses: processes];

        let name: *mut Object =
            msg_send![class!(NSString), stringWithUTF8String: b"Slatepad Meeting Tap\0".as_ptr()];
        let _: () = msg_send![description, setName: name];
        let _: () = msg_send![description, setPrivate: true];
        let _: () = msg_send![description, setExclusive: false];

        Ok(description)
    }
}

fn create_process_tap(description: *mut Object) -> Result<AudioObjectID, String> {
    unsafe {
        let mut tap_id = kAudioObjectUnknown;
        let status = AudioHardwareCreateProcessTap(description, &mut tap_id);
        if status != 0 {
            return Err(format!(
                "Failed to create process tap (status {status}). System audio permission may be denied."
            ));
        }
        Ok(tap_id)
    }
}

fn read_tap_uid(tap_id: AudioObjectID) -> Result<String, String> {
    unsafe {
        let property_address = AudioObjectPropertyAddress {
            mSelector: kAudioTapPropertyUID,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain,
        };

        let mut cf_uid: CFStringRef = ptr::null();
        let mut data_size = std::mem::size_of::<CFStringRef>() as u32;
        let status = AudioObjectGetPropertyData(
            tap_id,
            &property_address,
            0,
            ptr::null(),
            &mut data_size,
            &mut cf_uid as *mut _ as *mut _,
        );
        if status != 0 || cf_uid.is_null() {
            return Err(format!("Failed to read tap UID (status {status})"));
        }

        cf_string_to_string(cf_uid)
    }
}

fn read_tap_format(tap_id: AudioObjectID) -> Result<(u32, u16), String> {
    unsafe {
        let property_address = AudioObjectPropertyAddress {
            mSelector: kAudioTapPropertyFormat,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain,
        };

        let mut format = AudioStreamBasicDescription {
            mSampleRate: TARGET_SAMPLE_RATE as f64,
            mFormatID: kAudioFormatLinearPCM,
            mFormatFlags: (kAudioFormatFlagIsFloat | kAudioFormatFlagIsPacked) as u32,
            mBytesPerPacket: 0,
            mFramesPerPacket: 1,
            mBytesPerFrame: 0,
            mChannelsPerFrame: 1,
            mBitsPerChannel: 32,
            mReserved: 0,
        };
        let mut data_size = std::mem::size_of::<AudioStreamBasicDescription>() as u32;
        let status = AudioObjectGetPropertyData(
            tap_id,
            &property_address,
            0,
            ptr::null(),
            &mut data_size,
            &mut format as *mut _ as *mut _,
        );
        if status != 0 {
            return Ok((TARGET_SAMPLE_RATE, 1));
        }

        Ok((format.mSampleRate as u32, format.mChannelsPerFrame as u16))
    }
}

fn create_aggregate_device(tap_uid: &str) -> Result<AudioObjectID, String> {
    unsafe {
        let device_name = cf_string_from_str("Slatepad Aggregate Device")?;
        let device_uid = cf_string_from_str(&format!(
            "com.ysharma.slatepad.aggregate.{}",
            std::process::id()
        ))?;
        let tap_uid_cf = cf_string_from_str(tap_uid)?;

        let tap_entry = cf_dictionary_from_cstring_pairs(&[(
            kAudioSubTapUIDKey,
            tap_uid_cf as *const c_void,
        ), (
            kAudioSubTapDriftCompensationKey,
            kCFBooleanTrue as *const c_void,
        )])?;

        let tap_list = CFArrayCreate(
            kCFAllocatorDefault,
            &tap_entry as *const _ as *mut *const c_void,
            1,
            &kCFTypeArrayCallBacks,
        );
        if tap_list.is_null() {
            return Err("Failed to create tap list for aggregate device.".into());
        }

        let aggregate_properties = cf_dictionary_from_cstring_pairs(&[
            (kAudioAggregateDeviceNameKey, device_name as *const c_void),
            (kAudioAggregateDeviceUIDKey, device_uid as *const c_void),
            (kAudioAggregateDeviceTapListKey, tap_list as *const c_void),
            (
                kAudioAggregateDeviceTapAutoStartKey,
                kCFBooleanFalse as *const c_void,
            ),
            (
                kAudioAggregateDeviceIsPrivateKey,
                kCFBooleanTrue as *const c_void,
            ),
        ])?;

        let mut aggregate_device_id = kAudioObjectUnknown;
        let status =
            AudioHardwareCreateAggregateDevice(aggregate_properties, &mut aggregate_device_id);
        if status != 0 {
            return Err(format!("Failed to create aggregate device (status {status})"));
        }

        Ok(aggregate_device_id)
    }
}

fn register_io_proc(
    aggregate_device_id: AudioObjectID,
    capture_state: &CaptureState,
) -> Result<AudioDeviceIOProcID, String> {
    unsafe {
        let client_data = capture_state as *const CaptureState as *mut c_void;
        let mut io_proc_id: AudioDeviceIOProcID = None;
        let status = AudioDeviceCreateIOProcID(
            aggregate_device_id,
            Some(io_proc_callback),
            client_data,
            &mut io_proc_id,
        );
        if status != 0 {
            return Err(format!("Failed to register IOProc (status {status})"));
        }
        Ok(io_proc_id)
    }
}

fn unregister_io_proc(aggregate_device_id: AudioObjectID, io_proc_id: AudioDeviceIOProcID) {
    unsafe {
        let _ = AudioDeviceDestroyIOProcID(aggregate_device_id, io_proc_id);
    }
}

fn destroy_aggregate_device(aggregate_device_id: AudioObjectID) {
    unsafe {
        let _ = AudioHardwareDestroyAggregateDevice(aggregate_device_id);
    }
}

fn destroy_process_tap(tap_id: AudioObjectID) {
    unsafe {
        let _ = AudioHardwareDestroyProcessTap(tap_id);
    }
}

unsafe extern "C" fn io_proc_callback(
    _device: AudioObjectID,
    _now: *const AudioTimeStamp,
    input_data: *const AudioBufferList,
    _input_time: *const AudioTimeStamp,
    _output_data: *mut AudioBufferList,
    _output_time: *const AudioTimeStamp,
    client_data: *mut c_void,
) -> OSStatus {
    if client_data.is_null() || input_data.is_null() {
        return 0;
    }

    let state = &*(client_data as *const CaptureState);
    let buffer_list = &*input_data;
    let mut collected = Vec::new();

    for index in 0..buffer_list.mNumberBuffers {
        let buffer = &buffer_list.mBuffers[index as usize];
        if buffer.mData.is_null() || buffer.mDataByteSize == 0 {
            continue;
        }

        let sample_count = buffer.mDataByteSize as usize / std::mem::size_of::<f32>();
        let data = std::slice::from_raw_parts(buffer.mData as *const f32, sample_count);
        collected.extend_from_slice(data);
    }

    if collected.is_empty() {
        return 0;
    }

    let mono = mix_to_mono_interleaved(&collected, state.channels);
    let resampled = resample_mono(&mono, state.input_rate, TARGET_SAMPLE_RATE);
    if let Ok(mut samples) = state.samples.lock() {
        samples.extend_from_slice(&resampled);
    }

    0
}

unsafe fn cf_string_from_str(value: &str) -> Result<CFStringRef, String> {
    let c_string = CString::new(value).map_err(|e| e.to_string())?;
    let cf_string = CFStringCreateWithCString(
        kCFAllocatorDefault,
        c_string.as_ptr(),
        kCFStringEncodingUTF8,
    );
    if cf_string.is_null() {
        return Err("Failed to create CFString.".into());
    }
    Ok(cf_string)
}

unsafe fn cf_string_to_string(value: CFStringRef) -> Result<String, String> {
    let direct = CFStringGetCStringPtr(value, kCFStringEncodingUTF8);
    if !direct.is_null() {
        return Ok(std::ffi::CStr::from_ptr(direct)
            .to_string_lossy()
            .into_owned());
    }

    let length = CFStringGetLength(value);
    let mut buffer = vec![0i8; (length * 4 + 1) as usize];
    if CFStringGetCString(
        value,
        buffer.as_mut_ptr(),
        buffer.len() as i64,
        kCFStringEncodingUTF8,
    ) == 0
    {
        return Err("Failed to decode CFString.".into());
    }

    Ok(std::ffi::CStr::from_ptr(buffer.as_ptr())
        .to_string_lossy()
        .into_owned())
}

unsafe fn cf_dictionary_from_cstring_pairs(
    pairs: &[(&[u8], *const c_void)],
) -> Result<CFDictionaryRef, String> {
    let mut keys: Vec<CFStringRef> = Vec::with_capacity(pairs.len());
    let mut values: Vec<*const c_void> = Vec::with_capacity(pairs.len());

    for (key, value) in pairs {
        let key_cstr = CString::new(&key[..key.len() - 1]).map_err(|e| e.to_string())?;
        let cf_key = CFStringCreateWithCString(
            kCFAllocatorDefault,
            key_cstr.as_ptr(),
            kCFStringEncodingUTF8,
        );
        if cf_key.is_null() {
            return Err("Failed to create CFDictionary key.".into());
        }
        keys.push(cf_key);
        values.push(*value);
    }

    let dictionary = CFDictionaryCreate(
        kCFAllocatorDefault,
        keys.as_mut_ptr() as *mut *const c_void,
        values.as_mut_ptr(),
        pairs.len() as i64,
        &kCFTypeDictionaryKeyCallBacks,
        &kCFTypeDictionaryValueCallBacks,
    );

    if dictionary.is_null() {
        return Err("Failed to create CFDictionary.".into());
    }

    Ok(dictionary)
}
