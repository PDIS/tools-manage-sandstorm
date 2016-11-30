<p>
https://github.com/PDIS/tools/blob/master/auto_auth_user.js
</p>
<p>
Sandstorm 自動把新註冊的 @*.gov.tw 和 @sinica.edu.tw 使用者提升到 user 權限的工具<br>
需要安裝 phantomjs 執行，第一次使用及 session 認證失效時要手動執行一次，輸入 admin 的 E-Mail 和認證網址<br>
放到 /etc/ 時下的指令範例：<br>
<pre>
phantomjs --cookies-file=/etc/auto_auth_user.cookie /etc/auto_auth_user.js
</pre>
</p>
<hr>
<p>
https://github.com/PDIS/tools-manage-sandstorm/blob/master/typer_suggest.js
</p>
<p>
讀取速記聯絡人推薦表單的資料，然後寄信給被推薦人的工具<br>
本程式會產生 typer_suggest.conf 檔案，記錄已經處理到第幾筆紀錄。<br>
執行環境和認證等和auto_auth_user一樣，但指令因為牽扯到 cross-domain ，需要加上 --web-security=no：<br>
<pre>
phantomjs --web-security=no --cookies-file=/etc/typer_suggest.cookie /etc/typer_suggest.js
</pre>
</p>
