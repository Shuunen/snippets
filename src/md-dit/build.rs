// stamps the build time, and embeds the icon in the Windows executable (taskbar, Explorer)
fn main() {
    // the about dialog shows when the binary was built
    let built = std::process::Command::new("date")
        .arg("+%Y-%m-%d %H:%M")
        .output()
        .ok()
        .and_then(|out| String::from_utf8(out.stdout).ok())
        .unwrap_or_default();
    println!("cargo:rustc-env=BUILD_TIME={}", built.trim());
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows") {
        winresource::WindowsResource::new()
            .set_icon("icons/icon.ico")
            // the name Windows shows in "Open with" and the task manager
            .set("FileDescription", "Md-dit")
            .set("ProductName", "Md-dit")
            .compile()
            .expect("embed the Windows icon");
    }
}
