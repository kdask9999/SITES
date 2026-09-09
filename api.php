<?php
declare(strict_types=1);
header('Cache-Control: no-store');

$configFile = __DIR__ . '/config.local.php';
$config = is_file($configFile) ? require $configFile : [];
$action = $_GET['action'] ?? '';

function jsonResponse(array $data, int $status = 200): never {
  http_response_code($status); header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit;
}
function body(): array { $raw = file_get_contents('php://input'); $data = json_decode($raw ?: '{}', true); return is_array($data) ? $data : []; }
function db(): PDO {
  static $db;
  if ($db) return $db;
  $db = new PDO('sqlite:' . __DIR__ . '/crm.sqlite', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
  $db->exec('CREATE TABLE IF NOT EXISTS samples (id TEXT PRIMARY KEY, lead_id TEXT, slug TEXT UNIQUE, company_name TEXT, segment TEXT, city TEXT, phone TEXT, address TEXT, template TEXT, primary_color TEXT, pipeline_status TEXT DEFAULT "pronto_revisar", views INTEGER DEFAULT 0, created_at TEXT)');
  $db->exec('CREATE TABLE IF NOT EXISTS usage (day TEXT PRIMARY KEY, searches INTEGER DEFAULT 0, requests INTEGER DEFAULT 0)');
  return $db;
}
function requestJson(string $url, array $headers = [], ?array $payload = null): array {
  $ch = curl_init($url); $all = array_merge(['Accept: application/json'], $headers);
  curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>25,CURLOPT_HTTPHEADER=>$all,CURLOPT_FOLLOWLOCATION=>true]);
  if ($payload !== null) { curl_setopt($ch, CURLOPT_POST, true); curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload)); }
  $raw = curl_exec($ch); $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); $error = curl_error($ch); curl_close($ch);
  if ($raw === false || $status >= 400) throw new RuntimeException($error ?: "Serviço externo respondeu com erro {$status}.");
  return json_decode($raw, true) ?: [];
}
function digits(string $value): string { return preg_replace('/\D+/', '', $value) ?: ''; }
function phoneType(string $phone): string { $n = preg_replace('/^55/', '', digits($phone)); return strlen($n) === 11 && ($n[2] ?? '') === '9' ? 'mobile' : (strlen($n) === 10 ? 'landline' : 'unknown'); }
function slugify(string $value): string { $s = iconv('UTF-8','ASCII//TRANSLIT',$value) ?: $value; return trim(substr(preg_replace('/[^a-z0-9]+/','-',strtolower($s)) ?: 'empresa',0,58),'-'); }
function demoLeads(string $activity, string $city, int $limit): array {
  $names=['Horizonte Comercial','Central Serviços','Prime Soluções','Ponto Regional','Nova Empresa','Conecta Negócios','Base Profissional','Via Comercial']; $out=[];
  foreach(array_slice($names,0,min($limit,count($names))) as $i=>$name){$phone='+55649900000'.str_pad((string)$i,2,'0',STR_PAD_LEFT);$out[]=['id'=>'demo-'.($i+1),'name'=>$name.' · demonstração','category'=>$activity,'searchSegment'=>$activity,'phone'=>'(64) 99000-00'.str_pad((string)$i,2,'0',STR_PAD_LEFT),'phoneE164'=>$phone,'phoneType'=>'mobile','whatsappStatus'=>'pending','email'=>'','website'=>$i%2===0?'https://example.com':'','instagram'=>'','facebook'=>'','linkedin'=>'','address'=>'Av. Comercial, '.(120+$i*37),'city'=>$city,'rating'=>4.2,'reviewCount'=>20+$i*11,'googleMapsUrl'=>'https://maps.google.com','latitude'=>null,'longitude'=>null,'businessStatus'=>'OPERATIONAL','source'=>'demo'];}
  return $out;
}

try {
  if ($action === 'search') {
    $b=body(); $activity=trim(substr((string)($b['activity']??''),0,100)); $city=trim(substr((string)($b['city']??''),0,120)); $limit=max(1,min(60,(int)($b['limit']??20))); $key=trim((string)($config['google_maps_api_key']??''));
    if(strlen($activity)<2||strlen($city)<2) jsonResponse(['error'=>'Informe o segmento e a cidade.'],400);
    if(!$key) jsonResponse(['demo'=>true,'configured'=>false,'leads'=>demoLeads($activity,$city,$limit),'message'=>'Modo demonstração ativo. Configure a chave do Google Places para dados reais.']);
    $places=[];$seen=[];$requests=0;
    foreach(["{$activity} em {$city}","{$activity} na cidade de {$city}","{$activity} perto do centro de {$city}","{$activity} na região de {$city}"] as $query){
      $result=requestJson('https://places.googleapis.com/v1/places:searchText',['Content-Type: application/json','X-Goog-Api-Key: '.$key,'X-Goog-FieldMask: places.id,places.displayName,places.primaryTypeDisplayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.rating,places.userRatingCount,places.websiteUri,places.googleMapsUri,places.location,places.businessStatus'],['textQuery'=>$query,'pageSize'=>min(20,$limit),'languageCode'=>'pt-BR','regionCode'=>'BR']);$requests++;
      foreach(($result['places']??[]) as $p){$id=$p['id']??md5(($p['displayName']['text']??'').($p['formattedAddress']??''));if(isset($seen[$id]))continue;$seen[$id]=true;$phone=$p['internationalPhoneNumber']??$p['nationalPhoneNumber']??'';$type=phoneType($phone);$places[]=['id'=>$id,'name'=>$p['displayName']['text']??'Empresa','category'=>$p['primaryTypeDisplayName']['text']??$activity,'searchSegment'=>$activity,'phone'=>$p['nationalPhoneNumber']??$phone,'phoneE164'=>$phone,'phoneType'=>$type,'whatsappStatus'=>$type==='mobile'?'pending':($type==='landline'?'landline':'unavailable'),'email'=>'','website'=>$p['websiteUri']??'','instagram'=>'','facebook'=>'','linkedin'=>'','address'=>$p['formattedAddress']??'','city'=>$city,'rating'=>$p['rating']??null,'reviewCount'=>$p['userRatingCount']??0,'googleMapsUrl'=>$p['googleMapsUri']??'','latitude'=>$p['location']['latitude']??null,'longitude'=>$p['location']['longitude']??null,'businessStatus'=>$p['businessStatus']??'OPERATIONAL','source'=>'google'];}
    }
    $day=date('Y-m-d');$stmt=db()->prepare('INSERT INTO usage(day,searches,requests) VALUES(?,1,?) ON CONFLICT(day) DO UPDATE SET searches=searches+1, requests=requests+excluded.requests');$stmt->execute([$day,$requests]);
    jsonResponse(['demo'=>false,'configured'=>true,'leads'=>$places,'message'=>count($places)." empresas únicas encontradas em {$city}."]);
  }
  if ($action === 'usage') {
    $row=db()->query("SELECT COALESCE(SUM(searches),0) searches, COALESCE(SUM(requests),0) requests FROM usage WHERE substr(day,1,7)=strftime('%Y-%m','now')")->fetch(PDO::FETCH_ASSOC) ?: [];
    $today=db()->query("SELECT searches,requests FROM usage WHERE day=date('now')")->fetch(PDO::FETCH_ASSOC) ?: ['searches'=>0,'requests'=>0];
    jsonResponse(['configured'=>!empty($config['google_maps_api_key']),'month'=>date('Y-m'),'searches'=>(int)($row['searches']??0),'totalRequests'=>(int)($row['requests']??0),'grossListValueUsd'=>0,'estimatedPaidCostUsd'=>0,'freeCreditValueUsedUsd'=>0,'freeCreditValueLimitUsd'=>0,'freeCreditPercent'=>0,'daily'=>['date'=>date('Y-m-d'),'searches'=>(int)$today['searches'],'totalRequests'=>(int)$today['requests']],'updatedAt'=>date(DATE_ATOM),'lifetime'=>['searches'=>(int)($row['searches']??0),'totalRequests'=>(int)($row['requests']??0)],'skus'=>[],'pricingUpdatedAt'=>'2026-09-09','pricingSource'=>'https://mapsplatform.google.com/pricing/','usageLimitsSource'=>'https://developers.google.com/maps/documentation/places/web-service/usage-and-billing','quotaManagementSource'=>'https://console.cloud.google.com/google/maps-apis/quotas','disclaimer'=>'Estimativa baseada nas chamadas registradas.']);
  }
  if ($action === 'samples') {
    if($_SERVER['REQUEST_METHOD']==='GET'){$rows=db()->query('SELECT id,lead_id leadId,slug,company_name companyName,segment,city,phone,address,template,primary_color primaryColor,"pronto" status,pipeline_status pipelineStatus,views,created_at createdAt FROM samples ORDER BY created_at DESC')->fetchAll(PDO::FETCH_ASSOC);jsonResponse(['samples'=>$rows]);}
    $b=body();$created=[];foreach(array_slice($b['leads']??[],0,20) as $lead){$id=bin2hex(random_bytes(16));$slug=slugify((string)$lead['name']).'-'.substr($id,0,7);$row=['id'=>$id,'leadId'=>$lead['id'],'slug'=>$slug,'companyName'=>$lead['name'],'segment'=>$lead['searchSegment']??$lead['category']??'Empresa','city'=>$lead['city']??'','phone'=>$lead['phoneE164']??$lead['phone']??'','address'=>$lead['address']??'','template'=>$b['template']??'moderno','primaryColor'=>preg_match('/^#[0-9a-f]{6}$/i',$b['primaryColor']??'')?$b['primaryColor']:'#1769e0','status'=>'pronto','pipelineStatus'=>'pronto_revisar','views'=>0,'createdAt'=>date(DATE_ATOM)];$stmt=db()->prepare('INSERT INTO samples(id,lead_id,slug,company_name,segment,city,phone,address,template,primary_color,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)');$stmt->execute([$row['id'],$row['leadId'],$row['slug'],$row['companyName'],$row['segment'],$row['city'],$row['phone'],$row['address'],$row['template'],$row['primaryColor'],$row['createdAt']]);$created[]=$row;}jsonResponse(['samples'=>$created]);
  }
  if ($action === 'enrich') jsonResponse(['demo'=>true,'results'=>array_map(fn($t)=>['id'=>$t['id'],'email'=>'','instagram'=>'','facebook'=>'','linkedin'=>''],body()['targets']??[])]);
  if ($action === 'validate-whatsapp') jsonResponse(['configured'=>false,'results'=>array_map(fn($p)=>['phone'=>$p,'status'=>'valid'],body()['phones']??[])]);
  if ($action === 'sample-page') {
    $slug=$_GET['slug']??'';$stmt=db()->prepare('SELECT * FROM samples WHERE slug=?');$stmt->execute([$slug]);$s=$stmt->fetch(PDO::FETCH_ASSOC);if(!$s){http_response_code(404);exit('Amostra não encontrada');}db()->prepare('UPDATE samples SET views=views+1 WHERE id=?')->execute([$s['id']]);$color=htmlspecialchars($s['primary_color']);$name=htmlspecialchars($s['company_name']);$segment=htmlspecialchars($s['segment']);$city=htmlspecialchars($s['city']);$address=htmlspecialchars($s['address']);$phone=htmlspecialchars($s['phone']);$wa=digits($s['phone']);header('Content-Type: text/html; charset=utf-8');echo "<!doctype html><html lang='pt-BR'><meta name='viewport' content='width=device-width'><title>{$name}</title><style>body{margin:0;font-family:Arial;color:#142033}header,section,footer{padding:28px 7vw}.demo{background:#111827;color:#fff;text-align:center;padding:9px}.hero{padding-block:90px;background:linear-gradient(135deg,#fff,{$color}18)}h1{font-size:clamp(40px,6vw,72px);max-width:900px}.cta{display:inline-block;background:{$color};color:#fff;padding:15px 22px;border-radius:10px;text-decoration:none;font-weight:bold}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.cards div{padding:25px;border:1px solid #ddd;border-radius:14px}footer{background:#111827;color:#fff}@media(max-width:700px){.cards{grid-template-columns:1fr}}</style><div class='demo'>AMOSTRA DEMONSTRATIVA · NÃO É O SITE OFICIAL</div><header><strong>{$name}</strong></header><section class='hero'><small>{$segment}</small><h1>Qualidade e confiança para atender você em {$city}.</h1><p>Conheça nossas soluções e solicite atendimento.</p><a class='cta' href='https://wa.me/{$wa}'>Solicitar orçamento</a></section><section><h2>Nossos diferenciais</h2><div class='cards'><div><h3>Atendimento especializado</h3><p>Soluções para sua necessidade.</p></div><div><h3>Orçamento rápido</h3><p>Fale diretamente pelo WhatsApp.</p></div><div><h3>Qualidade</h3><p>Atendimento profissional.</p></div></div></section><section><h2>Contato</h2><p>{$phone}</p><p>{$address}</p></section><footer>{$name} · Site demonstrativo</footer></html>";exit;
  }
  jsonResponse(['error'=>'Rota não encontrada.'],404);
} catch(Throwable $e) { jsonResponse(['error'=>'Não foi possível concluir a operação.','detail'=>$e->getMessage()],500); }
