# Headless Raspberry Pi Setup Guide

Because you do not want to attach a monitor, mouse, or keyboard, we can run the Raspberry Pi entirely "headless" by using a Virtual Display (Xvfb). 

This allows Chromium to run our Kiosk page in the background, access the USB camera, and process faces without ever needing a physical screen!

### Audio Feedback Feature 🔊
Since you won't have a screen to look at, I have added **Audio Feedback** to the kiosk. If you plug a speaker into the Raspberry Pi's audio jack (or use a USB speaker), a voice will announce *"Attendance recorded for [Name]"* whenever someone's face is recognized!

---

## Step-by-Step Setup

1. **Connect via SSH:**
   Connect the Pi to your network, plug in the USB camera (and optional speaker), and SSH into it from your computer:
   ```bash
   ssh hairwise@<raspberry-pi-ip-address>
   ```

2. **Install Required Packages:**
   Install Chromium browser and the X Virtual Framebuffer (which simulates a monitor).
   ```bash
   sudo apt-get update
   sudo apt-get install -y chromium-browser xvfb
   ```

3. **Create the Auto-Start Script:**
   Create a script that launches the virtual monitor and opens the Kiosk URL with special flags to bypass camera permissions and enable audio.
   
   ```bash
   nano ~/start_kiosk.sh
   ```
   
   Paste the following into the file:
   ```bash
   #!/bin/bash
   # Start the virtual display
   Xvfb :99 -screen 0 1280x720x24 &
   export DISPLAY=:99
   
   # Wait a second for Xvfb to start
   sleep 2
   
   # Launch Chromium headlessly with the camera enabled
   chromium-browser \
     --kiosk \
     --no-sandbox \
     --disable-gpu \
     --use-fake-ui-for-media-stream \
     --autoplay-policy=no-user-gesture-required \
     "https://inhsuite.web.app/kiosk.html"
   ```
   *Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).*

4. **Make it Executable:**
   ```bash
   chmod +x ~/start_kiosk.sh
   ```

5. **Run it on Boot:**
   Let's tell the Pi to run this script automatically every time it powers on using cron.
   ```bash
   crontab -e
   ```
   Add this line to the very bottom of the file:
   ```bash
   @reboot /home/hairwise/start_kiosk.sh > /home/hairwise/kiosk.log 2>&1
   ```
   *Save and exit.*
   

## You're done!
You can now reboot your Raspberry Pi (`sudo reboot`). It will power on, silently start the virtual display, launch the Kiosk page, access the USB camera, and begin detecting faces and pushing them to your Firebase app in the background!
