# WebRTC MediaMTX Server Setup (Coolify Edition)

Since you are using **Coolify**, the deployment is much easier as it handles SSL and containerization for you.

## 1. Prepare Your Files
Ensure you have the following file in your repository:
1.  **`docker-compose.yaml`**: Defines the frontend and MediaMTX WebRTC services.

## 2. Deploy in Coolify
1.  **Add Resource**: In your Coolify dashboard, select your project/environment and click **+ Add Resource**.
2.  **Select Docker Compose**: Choose "Docker Compose" and either point it to your Git repository or paste the content of the `docker-compose.yaml`.
3.  **Set Environment Variables**:
    *   `MTX_WEBRTCICEHOSTNAT1TO1IPS`: Set this to your server's **Public IP address** (e.g., `123.45.67.89`) so WebRTC clients outside the network can connect.

## 3. Configure Domain & SSL
1.  In the "Network" or "Domains" tab of your Coolify resource, enter your intended domain (e.g., `https://adhan.yourdomain.com`).
2.  Coolify will automatically provision an SSL certificate via Let's Encrypt.
3.  WebRTC requires HTTPS/SSL to allow microphone access on client browsers.

## 4. Firewall Settings
Ensure that **UDP port 8189** is exposed and open in your server's firewall/security group, as WebRTC media streams are transmitted over UDP on this port.
