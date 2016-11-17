<p>
https://github.com/PDIS/tools/blob/master/auto_auth_user.js
</p>
<p>
Sandstorm 自動把新註冊的 @*.gov.tw 和 @sinica.edu.tw 使用者提升到 user 權限的工具<br>
需要安裝 phantomjs 執行，第一次使用及 session 認證失效時要手動執行一次，輸入 admin 的 E-Mail 和認證網址<br>
放到 /etc/ 時下的指令範例：<br>
<pre>
sudo phantomjs /etc/auto_auth_user.js --cookies-file=/etc/auto_auth_user.cookie
</pre>
</p>
