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
                // Already running, just open browser and exit
                OpenBrowser();
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
            ToolStripMenuItem itemOpen = new ToolStripMenuItem("🏠 Housemate'i Aç", null, (s, e) => OpenBrowser());
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
            trayIcon.DoubleClick += (s, e) => OpenBrowser();

            // 4. Start Server in Background Thread
            Thread starterThread = new Thread(StartServerAndOpenBrowser);
            starterThread.IsBackground = true;
            starterThread.Start();

            // 5. Run Message Loop
            Application.Run();
        }

        private static bool IsPortResponding()
        {
            try
            {
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create("http://localhost:3000/api/version");
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

        private static void StartServerAndOpenBrowser()
        {
            // If port 3000 is not already up, launch server
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

            // Open default browser
            OpenBrowser();

            // Show friendly notification in Windows notification center
            try
            {
                trayIcon.ShowBalloonTip(3000, "Housemate Çalışıyor", "Tarayıcınızda açıldı. Çıkış yapmak için simgeye sağ tıklayabilirsiniz.", ToolTipIcon.Info);
            }
            catch { }
        }

        private static void OpenBrowser()
        {
            try
            {
                Process.Start(new ProcessStartInfo("http://localhost:3000") { UseShellExecute = true });
            }
            catch (Exception ex)
            {
                MessageBox.Show("Tarayıcı açılamadı: " + ex.Message, "Housemate", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
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
                if (serverProcess != null && !serverProcess.HasExited)
                {
                    // Kill process tree
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
