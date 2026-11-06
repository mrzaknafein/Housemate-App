using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;

namespace Housemate
{
    public class Program
    {
        private static Mutex singleInstanceMutex;
        private static Process serverProcess;
        private static Process appWindowProcess;
        private static NotifyIcon trayIcon;
        private static ContextMenuStrip trayMenu;
        private static string appDir;

        [STAThread]
        public static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            // 1. Single-Instance Check
            bool isNewInstance;
            singleInstanceMutex = new Mutex(true, "Housemate_App_Single_Instance_Mutex", out isNewInstance);
            if (!isNewInstance)
            {
                // Already running, just open the native app window
                OpenNativeAppWindow();
                return;
            }

            // 2. Resolve App Directory
            appDir = AppDomain.CurrentDomain.BaseDirectory;
            if (!File.Exists(Path.Combine(appDir, "package.json")))
            {
                string desktopFallback = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Desktop), "Housemate");
                if (Directory.Exists(desktopFallback) && File.Exists(Path.Combine(desktopFallback, "package.json")))
                {
                    appDir = desktopFallback;
                }
            }

            // 3. Setup System Tray Icon & Context Menu
            trayMenu = new ContextMenuStrip();
            ToolStripMenuItem itemOpen = new ToolStripMenuItem("🏠 Housemate'i Aç", null, (s, e) => OpenNativeAppWindow());
            itemOpen.Font = new Font(itemOpen.Font, FontStyle.Bold);
            trayMenu.Items.Add(itemOpen);

            trayMenu.Items.Add(new ToolStripSeparator());

            ToolStripMenuItem itemExit = new ToolStripMenuItem("❌ Çıkış Yap", null, (s, e) => ExitApplication());
            trayMenu.Items.Add(itemExit);

            trayIcon = new NotifyIcon();
            trayIcon.Text = "Housemate — Ortak Gider Takip";
            trayIcon.ContextMenuStrip = trayMenu;

            // Load icon
            string iconPath = Path.Combine(appDir, "Housemate.ico");
            if (File.Exists(iconPath))
            {
                try { trayIcon.Icon = new Icon(iconPath); } catch { trayIcon.Icon = SystemIcons.Application; }
            }
            else
            {
                trayIcon.Icon = SystemIcons.Application;
            }

            trayIcon.Visible = true;
            trayIcon.DoubleClick += (s, e) => OpenNativeAppWindow();

            // 4. Start Server and Open Native Window in Background Thread
            Thread starterThread = new Thread(StartServerAndOpenApp);
            starterThread.IsBackground = true;
            starterThread.Start();

            // 5. Run Message Loop
            Application.Run();
        }

        private static string GetTargetUrl()
        {
            string urlFile = Path.Combine(appDir, "server-url.txt");
            if (File.Exists(urlFile))
            {
                try
                {
                    string url = File.ReadAllText(urlFile).Trim();
                    if (!string.IsNullOrEmpty(url)) return url;
                }
                catch { }
            }
            return "http://localhost:3000";
        }

        private static bool IsPortResponding()
        {
            string targetUrl = GetTargetUrl();
            if (!targetUrl.Contains("localhost") && !targetUrl.Contains("127.0.0.1"))
            {
                // Live VDS URL, no need to wait for local port
                return true;
            }

            try
            {
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create(targetUrl + "/api/version");
                req.Timeout = 1000;
                req.Method = "GET";
                using (HttpWebResponse res = (HttpWebResponse)req.GetResponse())
                {
                    return res.StatusCode == HttpStatusCode.OK;
                }
            }
            catch
            {
                return false;
            }
        }

        private static void StartServerAndOpenApp()
        {
            // If port 3000 is not already up, launch Next.js server in the background
            if (!IsPortResponding())
            {
                try
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = "cmd.exe";
                    psi.Arguments = "/c npm.cmd run start";
                    psi.WorkingDirectory = appDir;
                    psi.CreateNoWindow = true;
                    psi.UseShellExecute = false;
                    psi.WindowStyle = ProcessWindowStyle.Hidden;

                    serverProcess = Process.Start(psi);
                }
                catch (Exception ex)
                {
                    MessageBox.Show("Housemate sunucusu başlatılamadı: " + ex.Message, "Hata", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    ExitApplication();
                    return;
                }

                // Poll until ready (max 15 seconds)
                for (int i = 0; i < 30; i++)
                {
                    Thread.Sleep(500);
                    if (IsPortResponding())
                    {
                        break;
                    }
                }
            }

            // Open as Native Standalone App Window (No browser URL bar or tabs)
            OpenNativeAppWindow();

            // Friendly system notification
            try
            {
                trayIcon.ShowBalloonTip(2500, "Housemate", "Uygulama penceresi açıldı. Kapatmak için pencereyi kapatabilir veya simgeye sağ tıklayabilirsiniz.", ToolTipIcon.Info);
            }
            catch { }
        }

        private static string FindAppBrowserPath()
        {
            string[] candidates = new string[]
            {
                @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                @"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Microsoft\Edge\Application\msedge.exe"),
                @"C:\Program Files\Google\Chrome\Application\chrome.exe",
                @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Google\Chrome\Application\chrome.exe")
            };

            foreach (string path in candidates)
            {
                if (File.Exists(path)) return path;
            }
            return null;
        }

        private static void OpenNativeAppWindow()
        {
            string browserPath = FindAppBrowserPath();
            if (browserPath != null)
            {
                try
                {
                    if (appWindowProcess != null && !appWindowProcess.HasExited)
                    {
                        return;
                    }

                    string nativeProfileDir = Path.Combine(appDir, ".native-profile");
                    string targetUrl = GetTargetUrl();
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = browserPath;
                    // Native app window mode: no URL bar, no tabs, custom window size
                    psi.Arguments = string.Format(
                        "--app={0} --window-size=1280,840 --user-data-dir=\"{1}\"",
                        targetUrl,
                        nativeProfileDir
                    );
                    psi.UseShellExecute = false;

                    appWindowProcess = Process.Start(psi);

                    if (appWindowProcess != null)
                    {
                        appWindowProcess.EnableRaisingEvents = true;
                        appWindowProcess.Exited += (s, e) =>
                        {
                            // When user closes the native app window, cleanly shut down
                            ExitApplication();
                        };
                    }
                    return;
                }
                catch { }
            }

            // Fallback: default browser
            try
            {
                Process.Start(new ProcessStartInfo(GetTargetUrl()) { UseShellExecute = true });
            }
            catch { }
        }

        private static void ExitApplication()
        {
            try
            {
                if (trayIcon != null)
                {
                    trayIcon.Visible = false;
                    trayIcon.Dispose();
                }
            }
            catch { }

            try
            {
                if (appWindowProcess != null && !appWindowProcess.HasExited)
                {
                    appWindowProcess.Kill();
                }
            }
            catch { }

            try
            {
                if (serverProcess != null && !serverProcess.HasExited)
                {
                    ProcessStartInfo killPsi = new ProcessStartInfo("taskkill", "/F /T /PID " + serverProcess.Id);
                    killPsi.CreateNoWindow = true;
                    killPsi.UseShellExecute = false;
                    Process.Start(killPsi);
                }
            }
            catch { }

            if (singleInstanceMutex != null)
            {
                try { singleInstanceMutex.ReleaseMutex(); } catch { }
            }

            Application.Exit();
            Environment.Exit(0);
        }
    }
}
