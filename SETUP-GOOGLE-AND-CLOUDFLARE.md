# Putting the Gardens RFC website online

Two free services:

- **Google Sheets** stores what people send through the website: member registrations, newsletter stories, community activities and newsletter sign-ups.
- **Cloudflare Pages** hosts the website itself.

Allow about 30 minutes the first time. Afterwards, updating the site takes about two minutes.

> **Use the club's own Google account,** not a personal or work account. The sheet will hold members' personal details, so the club should own it, and only the officials who need it should have access (POPIA).

---

## Part 1: Google Sheet for the forms

1. Sign in to the club's Google account and open **Google Sheets**. Create a blank spreadsheet and name it **Gardens RFC website**.
2. In the sheet, open **Extensions > Apps Script**.
3. Delete the sample code. Open `google-apps-script/Code.gs` from this folder, copy everything in it, and paste it in. Click **Save**.
4. Optional: to get an email when someone registers or sends a story, put the address between the quotes on the line `const NOTIFY_EMAIL = "";` and save again.
5. Click **Deploy > New deployment**. Click the gear icon next to "Select type" and choose **Web app**. Then set:
   - **Execute as:** Me
   - **Who has access:** Anyone

   Click **Deploy**.
6. Google asks for permission. Click **Authorize access** and choose the club account. If you see "Google hasn't verified this app", click **Advanced**, then **Go to … (unsafe)**. This is normal for a script you wrote yourself: it only touches this one spreadsheet.
7. Copy the **Web app URL**. It starts with `https://script.google.com/macros/s/` and ends in `/exec`.
8. Check that it works: paste that address into a browser tab. You should see `"Gardens RFC forms are connected."`
9. Open `assets/js/data.js` and paste the address between the quotes:

   ```js
   backend: {
     googleScriptUrl: "https://script.google.com/macros/s/XXXXXXXX/exec"
   },
   ```

The **Members**, **Contributions**, **Subscribers** and **Predictions** tabs appear in the sheet the first time someone uses each form.

**If you change the script later:** use **Deploy > Manage deployments**, click the pencil icon, choose **Version: New version**, then **Deploy**. The web address stays the same.

**Predict the Score:** if the sheet was set up before the game was added, paste the new `Code.gs` in and deploy a new version as above, or predictions will not save. After a match, reload the sheet and use the menu **Gardens RFC > Find the prediction winner**: pick the match, type the final score (for example `24-17`), and it lists the closest guesses with their cell numbers. Then add the winner's first name and surname initial to `predict.winners` in `data.js`.

**Memories on the Oom Charles page:** visitors can send a memory and up to 5 photos. They arrive in the **Contributions** tab with Type `Memory` and Status `pending`. The photos are saved in a private Google Drive folder called **Gardens RFC memorial photos**, with links in the **Photos** column. Because the script saves to Drive, Google asks for permission again the first time you deploy this version. Accept it as in step 6.

---

## Part 2: Put the website on Cloudflare

1. Double-click **`Prepare upload for Cloudflare.bat`**. It makes a fresh `deploy` folder holding only the public website, and opens it. Private files (`members.db`, `server.py`, the zip and the original `videos` folder) are left out.
   - A warning that `googleScriptUrl` is empty means Part 1, step 9 is not done yet.
2. Go to **dash.cloudflare.com** and create a free account, or sign in.
3. Open **Workers & Pages** and click **Create**. On the **Pages** tab, choose **Upload assets** (also called Direct Upload).
4. Name the project, for example `gardens-rfc`. This becomes the address: **gardens-rfc.pages.dev**.
5. Drag the **`deploy`** folder onto the upload box and click **Deploy site**.

**To update the site later:** double-click `Prepare upload for Cloudflare.bat` again. In Cloudflare, open the project, click **Create deployment** (or **Upload assets** for a new version), and drag in the new `deploy` folder.

**Own domain (optional):** to use an address such as `gardensrfc.co.za`, buy the domain from any South African registrar (there is a yearly fee). Then open the project in Cloudflare, go to **Custom domains**, and follow the steps.

---

## Part 3: Test it once it is live

1. Open the live site and submit a test **member registration** with your own details.
2. Check that a row appears in the **Members** tab of the sheet.
3. Do the same with a **newsletter story**, a **community activity** and a **newsletter sign-up**.
4. Delete the test rows from the sheet.

---

## Every day

| To… | Do this |
|---|---|
| Add photos to an album | Copy them into the album's folder in `assets/img` (for example `Oom Charles`), then prepare and upload the site again. |
| Post fixtures, results, announcements, coaches, live streams | Edit `assets/js/data.js`, then prepare and upload again. |
| See registrations and stories | Open the Google Sheet. |
| Approve a story or activity | Change its **Status** in the Contributions tab to `approved`, and add it to `newsletter` or `community` in `data.js`. |
| Approve a memory for Oom Charles | Change its **Status** to `approved`. Add the words to `memories` under `oom-charles` in `data.js`, for example `{ name: "Jan Smith", text: "He never missed a home game." }`. Download the approved photos from the Drive folder into `assets/img/Oom Charles`. Then prepare and upload the site again. |
| Add birthdays | Add each person to `birthdays` in `data.js`, for example `{ name: "Jan Smith", birthday: "03-14", group: "Player" }` (month, then day). They are congratulated in Announcements and Gardens Monthly during their month. Only the day and month show, never the year. Ask each person first, and delete the example entries. |
| Add someone to the Wall of Remembrance | Copy their photo or funeral notice into `assets/img/memorial`. It shows under "Together" straight away. To give them their own card, add them to `people` under `memorial` in `data.js`, for example `{ name: "Jan Smith", years: "1950 - 2026", photos: ["the-file-name.jpg"] }`. Memories sent from the Wall of Remembrance show "(Wall of Remembrance)" in the Memorial column. Candles lit on the wall are counted for each name in the Apps Script's own storage (after updating `Code.gs`, deploy a new version: Deploy > Manage deployments > Edit > New version). |
| Change the memorial music | Copy an MP3 the club is allowed to use into `assets/audio`, then change `music` under `oom-charles` in `data.js`. |
| Test changes before uploading | Double-click **`Start website (local test).bat`**. The site opens on this computer. |

When testing on this computer with no Google address set, the forms save to `members.db` instead. `python server.py --export` turns that into spreadsheet (CSV) files.
