# Icecast Server Setup (Coolify Edition)

Since you are using **Coolify**, the deployment is much easier as it handles SSL and containerization for you.

## 1. Prepare Your Files
Ensure you have the following two files in your repository (which I've already created for you):
1.  **`docker-compose.yml`**: Defines the Icecast service.
2.  **`icecast.xml`**: Your custom server configuration.

## 2. Deploy in Coolify
1.  **Add Resource**: In your Coolify dashboard, select your project/environment and click **+ Add Resource**.
2.  **Select Docker Compose**: Choose "Docker Compose" and either point it to your Git repository or paste the content of the `docker-compose.yml` I provided.
3.  **Config Storage**: In the "Storage" or "Files" section of the resource, ensure the `icecast.xml` is correctly mapped to `/etc/icecast2/icecast.xml`.
4.  **Set Environment Variables**:
    *   `ICECAST_SOURCE_PASSWORD`: Your secret password for broadcasting.
    *   `ICECAST_ADMIN_PASSWORD`: For the admin dashboard.

## 3. Configure Domain & SSL
1.  In the "Network" or "Domains" tab of your Coolify resource, enter your intended domain (e.g., `https://adhan.yourdomain.com`).
2.  Coolify will automatically provision an SSL certificate via Let's Encrypt.
3.  Ensure port `8001` is exposed and the health check (optional) points to `/status.xsl`.


## 4. Connecting the Broadcaster
In your **Broadcaster Dashboard** or **BUTT** software:
- **Server**: `adhan.yourdomain.com`
- **Port**: `443` (HTTPS)
- **Mount Point**: `/adhan_live`
- **Password**: The source password you set in Coolify.


---

### Low Latency Tip:
In `icecast.xml`, ensure `<burst-on-connect>` is `0` to prevent the server from sending old segments to new listeners, keeping the stream as "Live" as possible.
