<?php
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
ini_set('display_errors','0');
function respond($data,$status=200){http_response_code($status);echo json_encode($data,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);exit;}
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    respond(['error' => 'POST required'], 405);
}

$accessCode = getenv('STUDIO_ACCESS_CODE');
if ($accessCode === false || !preg_match('/^[a-f0-9]{64}$/D', $accessCode)) {
    respond(['error' => 'Studio access is not configured on the server.'], 503);
}
if (!hash_equals($accessCode, $_SERVER['HTTP_X_STUDIO_ACCESS'] ?? '')) {
    respond(['error' => 'Invalid studio access code.'], 403);
}

$key = getenv('OPENAI_API_KEY');
if ($key === false || trim($key) === '') {
    respond(['error' => 'The OpenAI API key is not configured on the server.'], 503);
}
if (!function_exists('curl_init') || !class_exists('finfo')) {
    respond(['error' => 'PHP cURL and fileinfo extensions are required.'], 503);
}
if (!$_POST) {
    respond(['error' => 'Missing form data or upload exceeds the hosting limit.'], 400);
}
foreach (['description', 'mode', 'style', 'placement', 'ratio', 'operation'] as $field) {
    if (isset($_POST[$field]) && !is_string($_POST[$field])) {
        respond(['error' => 'Invalid form field.'], 400);
    }
}
$description=trim((string)($_POST['description']??''));
$mode=(string)($_POST['mode']??'hybrid');$style=(string)($_POST['style']??'realism');
$placement=substr((string)($_POST['placement']??'forearm'),0,100);
$ratio=(string)($_POST['ratio']??'portrait');
$operation=(string)($_POST['operation']??'generate');
if(!in_array($mode,['text','reference','hybrid'],true)||!in_array($style,['realism','fusion','custom'],true)||!in_array($operation,['generate','revise'],true))respond(['error'=>'Invalid options'],400);
if(strlen($description)>5000)respond(['error'=>'Description too long'],400);
$styleText=['realism'=>'Black and grey realism, cinematic lighting, high contrast, smooth gradients, clear readable silhouettes, clean negative space, professional tattoo composition, no unnecessary tiny details, no color.', 'fusion'=>'Black and grey realistic central subject with bold traditional tattoo outlines and selective red, gold and deep green accents ONLY on ornamental elements; traditional roses, ribbons, halos when appropriate; strong clean silhouette.', 'custom'=>'Professional custom tattoo design with coherent anatomy, readable composition and tattooable contrast.'][$style];
$instruction="Create an ORIGINAL professional tattoo artwork on a clean white background, flat artwork only, NO skin, NO mockup, NO watermark. Placement: $placement. Art direction: $styleText. User brief: ".($description?:'Create an original expressive tattoo concept.').". Avoid copying the reference images literally; combine their ideas into a distinct new composition. Ensure accurate anatomy, physically plausible objects, consistent perspective and clear focal hierarchy.";
if($operation==='revise')$instruction="Revise the supplied existing tattoo design. Preserve its overall identity and all elements not explicitly requested to change. Requested edits: ".($description?:'Refine readability and anatomy').". Output the revised flat artwork on white background. Style: $styleText.";
$size=match($ratio){'square'=>'1024x1024','landscape'=>'1536x1024',default=>'1024x1536'};
$files=[];$uploads=$_FILES['references']??null;
if($uploads){$names=is_array($uploads['name'])?$uploads['name']:[$uploads['name']];$tmp=is_array($uploads['tmp_name'])?$uploads['tmp_name']:[$uploads['tmp_name']];$errs=is_array($uploads['error'])?$uploads['error']:[$uploads['error']];foreach($names as $i=>$name){if (($errs[$i] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) continue;if (($errs[$i] ?? null) !== UPLOAD_ERR_OK) respond(['error'=>'Image upload failed or exceeds the hosting limit'],400);if(count($files)>=5)respond(['error'=>'Maximum 5 images'],400);$path=$tmp[$i];if(!is_uploaded_file($path)||filesize($path)>10*1024*1024)respond(['error'=>'Each image must be under 10MB'],400);$mime=(new finfo(FILEINFO_MIME_TYPE))->file($path);if(!in_array($mime,['image/jpeg','image/png','image/webp'],true))respond(['error'=>'Only JPEG, PNG and WEBP images supported'],400);$files[]=['path'=>$path,'mime'=>$mime,'name'=>'reference'.($i+1).($mime==='image/png'?'.png':($mime==='image/webp'?'.webp':'.jpg'))];}}
if($mode==='reference' && !$files)respond(['error'=>'Upload at least one reference'],400);
if($operation==='revise' && !$files)respond(['error'=>'Upload the current design for revision'],400);
if($mode==='text' && $operation==='generate')$files=[];
$model='gpt-image-1.5';
$fields=['model'=>$model,'prompt'=>$instruction,'size'=>$size,'quality'=>'medium','output_format'=>'png'];
$url='https://api.openai.com/v1/images/generations';
if($files){$url='https://api.openai.com/v1/images/edits';foreach($files as $i=>$f)$fields['image['.$i.']']=new CURLFile($f['path'],$f['mime'],$f['name']);}
$headers = ['Authorization: Bearer ' . trim($key)];
$body = $fields;
if (!$files) {
    $headers[] = 'Content-Type: application/json';
    $body = json_encode($fields, JSON_INVALID_UTF8_SUBSTITUTE);
}

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_POSTFIELDS => $body,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => 180,
]);
$raw = curl_exec($ch);
$http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
if ($raw === false) {
    error_log('Tattoo Studio: OpenAI request failed with cURL error ' . curl_errno($ch));
    respond(['error' => 'Could not reach the image service.'], 502);
}
if ($http < 200 || $http >= 300) {
    respond(['error' => 'The image service rejected the request.', 'status' => $http], 502);
}
$data = json_decode($raw, true);
$b64 = $data['data'][0]['b64_json'] ?? null;
if (!is_string($b64) || $b64 === '') {
    respond(['error' => 'The image service returned no image data.'], 502);
}
respond(['image' => 'data:image/png;base64,' . $b64]);
