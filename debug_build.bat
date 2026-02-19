@echo off
echo Setting up Visual Studio environment...
if exist "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\vsdevcmd.bat" (
    call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\vsdevcmd.bat" -arch=x64
) else (
    echo VS Build Tools not found at standard path! Continuing anyway...
)

echo.
echo Building Rust backend (verbose)...
cd src-tauri
cargo build --verbose
if %errorlevel% neq 0 (
    echo BUILD FAILED with exit code %errorlevel%
    exit /b %errorlevel%
)
echo BUILD SUCCESS
