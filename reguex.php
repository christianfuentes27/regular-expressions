<?php
// Evaluate regular expression and returns if it matches or not
preg_match('/\d+/', $argv[1], $matches);
$response = 'It matches';
if (empty($matches)) {
    $response = 'It doesn\'t match';
}
echo $response;