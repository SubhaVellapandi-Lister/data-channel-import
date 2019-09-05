#!/usr/bin/expect -f

# set our args into variables
set i 0; foreach n $argv {set "p[incr i]" $n}

set timeout 60
#npm login command, add whatever command-line args are necessary
spawn npm login --registry=https://hobsons.jfrog.io/hobsons/api/npm/hobsons-platform-team/ --scope=@$p4
match_max 100000

expect "Username"
send "$p1\r"

expect "Password"
send "$p2\r"

expect "Email"
send "$p3\r"

expect eof