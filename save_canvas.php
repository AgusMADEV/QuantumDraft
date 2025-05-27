<?php
$saveDir = __DIR__ . '/saved_drawings/';
if (!is_dir($saveDir)) {
    mkdir($saveDir, 0755, true);
}

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['image']) || !isset($data['name'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Faltan datos']);
    exit;
}

$name = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $data['name']);
$timestamp = time();
$baseName = $name . '_' . $timestamp;

$imageData = $data['image'];
$parts = explode(',', $imageData);
$decoded = base64_decode($parts[1]);

$filename = $baseName . '.png';
$filePath = $saveDir . $filename;
$date = date('Y-m-d H:i:s');
$width = 900;
$height = 500;

file_put_contents($filePath, $decoded);

$meta = [
    'filename' => $filename,
    'saved_at' => $date,
    'width' => $width,
    'height' => $height,
    'name' => $name
];
file_put_contents($saveDir . $baseName . '.json', json_encode($meta, JSON_PRETTY_PRINT));

$csvFile = $saveDir . 'drawings.csv';
$csvLine = [$filename, $date, $width, $height, $name];

if (!file_exists($csvFile)) {
    $header = ['Filename', 'Saved At', 'Width', 'Height', 'Name'];
    $fp = fopen($csvFile, 'w');
    fputcsv($fp, $header);
} else {
    $fp = fopen($csvFile, 'a');
}
fputcsv($fp, $csvLine);
fclose($fp);

echo json_encode(['success' => true, 'filename' => $filename]);
?>
