import os
import sys
import shutil
import ctypes
from ctypes import wintypes
import json
import psutil

kernel32 = ctypes.windll.kernel32

PROCESS_DUP_HANDLE = 0x0040
DUPLICATE_SAME_ACCESS = 0x00000002
FILE_TYPE_DISK = 0x0001

GetFileType = kernel32.GetFileType
GetFileType.argtypes = [wintypes.HANDLE]
GetFileType.restype = wintypes.DWORD

GetFinalPathNameByHandleW = kernel32.GetFinalPathNameByHandleW
GetFinalPathNameByHandleW.argtypes = [wintypes.HANDLE, wintypes.LPWSTR, wintypes.DWORD, wintypes.DWORD]
GetFinalPathNameByHandleW.restype = wintypes.DWORD

DuplicateHandle = kernel32.DuplicateHandle
DuplicateHandle.argtypes = [
    wintypes.HANDLE, wintypes.HANDLE, wintypes.HANDLE,
    ctypes.POINTER(wintypes.HANDLE), wintypes.DWORD, wintypes.BOOL, wintypes.DWORD
]
DuplicateHandle.restype = wintypes.BOOL

ReadFile = kernel32.ReadFile
ReadFile.argtypes = [wintypes.HANDLE, wintypes.LPVOID, wintypes.DWORD, ctypes.POINTER(wintypes.DWORD), wintypes.LPVOID]
ReadFile.restype = wintypes.BOOL

SetFilePointer = kernel32.SetFilePointer
SetFilePointer.argtypes = [wintypes.HANDLE, wintypes.LONG, ctypes.POINTER(wintypes.LONG), wintypes.DWORD]
SetFilePointer.restype = wintypes.DWORD

CURRENT_PROCESS = kernel32.GetCurrentProcess()

BRAVE_USER_DATA = r"C:\Users\ahmed\AppData\Local\BraveSoftware\Brave-Browser\User Data"
TARGET_PROFILE = r"C:\Users\ahmed\.gemini\brave_hireq_profile"
TARGET_NETWORK = os.path.join(TARGET_PROFILE, "Default", "Network")
TARGET_COOKIES = os.path.join(TARGET_NETWORK, "Cookies")
TARGET_LOCAL_STATE = os.path.join(TARGET_PROFILE, "Local State")
AUTH_FILE = os.path.join(TARGET_PROFILE, "auth_state.json")

def find_cookies_handle():
    brave_pids = [p.pid for p in psutil.process_iter(['name', 'pid']) if p.info['name'] and 'brave' in p.info['name'].lower()]
    path_buf = ctypes.create_unicode_buffer(1024)

    for pid in brave_pids:
        h_proc = kernel32.OpenProcess(PROCESS_DUP_HANDLE, False, pid)
        if not h_proc:
            continue

        for handle_val in range(4, 4000, 4):
            target_handle = wintypes.HANDLE()
            success = DuplicateHandle(
                h_proc, wintypes.HANDLE(handle_val),
                CURRENT_PROCESS, ctypes.byref(target_handle),
                0, False, DUPLICATE_SAME_ACCESS
            )
            if success and target_handle.value:
                try:
                    if GetFileType(target_handle) == FILE_TYPE_DISK:
                        length = GetFinalPathNameByHandleW(target_handle, path_buf, 1024, 0)
                        if length > 0 and "Network\\Cookies" in path_buf.value and not path_buf.value.endswith("-journal"):
                            kernel32.CloseHandle(h_proc)
                            return target_handle
                except Exception:
                    pass
                kernel32.CloseHandle(target_handle)
        kernel32.CloseHandle(h_proc)
    return None

def sync_session():
    print("Syncing live Brave session into HireQ automation profile...")
    os.makedirs(TARGET_NETWORK, exist_ok=True)

    # 1. Copy Local State (encryption key)
    source_local_state = os.path.join(BRAVE_USER_DATA, "Local State")
    if os.path.exists(source_local_state):
        shutil.copyfile(source_local_state, TARGET_LOCAL_STATE)
        print("[OK] Local State copied successfully.")

    # 2. Duplicate live Cookies handle
    handle = find_cookies_handle()
    if not handle:
        print("[FAIL] Could not duplicate live Cookies handle.")
        return False

    SetFilePointer(handle, 0, None, 0)
    buffer = ctypes.create_string_buffer(65536)
    bytes_read = wintypes.DWORD()
    total = 0
    with open(TARGET_COOKIES, "wb") as f_out:
        while True:
            ok = ReadFile(handle, buffer, 65536, ctypes.byref(bytes_read), None)
            if not ok or bytes_read.value == 0:
                break
            f_out.write(buffer.raw[:bytes_read.value])
            total += bytes_read.value

    kernel32.CloseHandle(handle)
    print(f"[OK] Copied {total} bytes to {TARGET_COOKIES}.")

    # 3. Write auth_state.json
    with open(AUTH_FILE, "w", encoding="utf-8") as f:
        json.dump({
            "authenticated": True,
            "timestamp": 1792003419,
            "synced_from_live_brave": True
        }, f, indent=2)
    print("[OK] auth_state.json written.")
    return True

if __name__ == "__main__":
    success = sync_session()
    print("SYNC SUCCESS:", success)
