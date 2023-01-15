<?php
preg_match('/\d?/', $argv[1], $matches);
echo $matches[0];