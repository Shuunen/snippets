
<?php
// options of this script
$enableLogging = false; // Set true to enable logging to php_error.log
$envPath = __DIR__ . '/olivo-hue-status.env';

ini_set('error_log', __DIR__ . '/php_error.log');
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

if ($enableLogging) error_log('script started at ' . date('Y-m-d H:i:s'));

stream_context_set_default([
  'ssl' => [
    'verify_peer' => false,
    'verify_peer_name' => false,
  ],
]);

/**
 * Returns a hue color based on the progress percentage, from red to green
 * @param int $percent the progress percentage
 * @return int the hue color between 0 (red) and 20000 (green)
 */
function getHueColor(int $percent = 0): int {
  return (int) round($percent * 20000 / 100);
}

/**
 * Returns the body to emit a hue color based on the progress percentage
 * @param int $percent the progress percentage
 * @return string the body to emit a hue color based on the progress percentage
 */
function getHueColorBody(int $percent = 0): string {
  $isEverythingDone = $percent === 100;
  $body = [
    'bri' => 255,
    'hue' => getHueColor($percent),
    'on' => !$isEverythingDone,
    'sat' => 255
  ];
  // echo "with a $percent% progress will emit hue color", json_encode($body), "<br>";
  return json_encode($body);
}

function jsonResponse(  bool $ok,  string $message,  $progress,  $response = null,  $data = null,  $remaining = null,  $nextTask = null): string {
  global $enableLogging;
  $jsonArr = [
    'ok' => $ok,
    'message' => $message,
    'progress' => $progress,
    'remaining' => $remaining,
    'nextTask' => $nextTask,
    'response' => $response,
    'data' => $data,
    'datetime' => date('Y-m-d H:i:s')
  ];
  $jsonStr = json_encode($jsonArr);
  if ($enableLogging || !$ok) error_log('jsonResponse : ' . $jsonStr);
  return $jsonStr;
}

function getEnvEndpoints(string $envPath): array {
  $hueEndpoint = '';
  $trmnlEndpoint = '';
  if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
      if (str_starts_with($line, 'HUE_ENDPOINT=')) {
        $hueEndpoint = substr($line, 13);
      } elseif (str_starts_with($line, 'TRMNL_ENDPOINT=')) {
        $trmnlEndpoint = substr($line, 15);
      }
    }
  }
  return [$hueEndpoint, $trmnlEndpoint];
}


/**
 * Emit a hue color based on the progress percentage
 * @param string $progressString the progress percentage
 * @param number $remaining the remaining time
 * @param string $nextTask the next task name
 * @return void
 */
function setProgress(string $progressString = '0', $remaining = null, $nextTask = null): void {
  $progress = intval($progressString);
  if (!is_numeric($progressString) || $progress < 0 || $progress > 100) {
    echo jsonResponse(false, 'Invalid progress value. It must be an integer between 0 and 100.', $progress, null, null, $remaining, $nextTask);
    return;
  }
  $data = getHueColorBody($progress);
  global $envPath;
  [$hueEndpoint, $trmnlEndpoint] = getEnvEndpoints($envPath);
  if ($hueEndpoint === '') {
    echo jsonResponse(false, 'HUE_ENDPOINT not set in .env file', $progress, null, null, $remaining, $nextTask);
    return;
  }
  if ($trmnlEndpoint === '') {
    echo jsonResponse(false, 'TRMNL_ENDPOINT not set in .env file', $progress, null, null, $remaining, $nextTask);
    return;
  }

  // Emit to HUE endpoint
  $ch = curl_init($hueEndpoint);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => 'PUT',
    CURLOPT_HTTPHEADER => [
      'Content-Type: application/json',
      'Content-Length: ' . strlen($data)
    ],
    CURLOPT_POSTFIELDS => $data,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false
  ]);
  $hueResult = curl_exec($ch);
  $hueError = $hueResult === false ? curl_error($ch) : null;
  curl_close($ch);

  // Emit to TRMNL endpoint
  $trmnlPayload = [
    'merge_variables' => [
      'nextTitle' => $nextTask,
      'progress' => $progress,
      'remaining' => ($remaining !== null && $remaining !== '') ? $remaining . ' min to take care' : null
    ]
  ];
  $payloadJson = json_encode($trmnlPayload);
  $chTrmnl = curl_init($trmnlEndpoint);
  curl_setopt_array($chTrmnl, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
      'Content-Type: application/json',
      'Content-Length: ' . strlen($payloadJson)
    ],
    CURLOPT_POSTFIELDS => $payloadJson,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false
  ]);
  $trmnlResult = curl_exec($chTrmnl);
  $trmnlError = $trmnlResult === false ? curl_error($chTrmnl) : null;
  curl_close($chTrmnl);

  $response = [
    'hue' => $hueResult === false ? $hueError : json_decode($hueResult),
    'trmnl' => $trmnlResult === false ? $trmnlError : json_decode($trmnlResult)
  ];
  $ok = ($hueResult !== false && $trmnlResult !== false);
  echo jsonResponse($ok, 'Emitted hue and trmnl color successfully', $progress, $response, json_decode($data), $remaining, $nextTask);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $progress = htmlspecialchars($_POST['progress'] ?? '');
  $remaining = htmlspecialchars($_POST['remaining'] ?? null);
  $nextTask = htmlspecialchars($_POST['nextTask'] ?? null);
  setProgress($progress, $remaining, $nextTask);
} else {
  ?>
  <form method="POST">
    <label for="progress">Your progress (%) :</label>
    <input type="text" id="progress" name="progress" placeholder="50">
    <label for="remaining">Time remaining (minutes) :</label>
    <input type="text" id="remaining" name="remaining" placeholder="10">
    <label for="nextTask">Next task name :</label>
    <input type="text" id="nextTask" name="nextTask" placeholder="Task name">
    <button type="submit">Send</button>
  </form>
  <?php
}
?>
