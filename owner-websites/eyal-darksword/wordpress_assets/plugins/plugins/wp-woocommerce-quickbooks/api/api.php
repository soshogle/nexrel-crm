<?php
// Exit if accessed directly
if( !defined( 'ABSPATH' ) ) exit;

if(!class_exists('vxc_qbooks_api')){
    
class vxc_qbooks_api extends vxc_qbooks{
  
  public $info='' ; // info
  public $error= "";
  public $timeout=30;
  public $api_res='';
  public $url='https://quickbooks.api.intuit.com';
  
  function __construct($info) { 
        if(isset($info['data'])){
  $this->info= $info['data']; 
  if(!empty($this->info['env'])){
    $this->url='https://sandbox-quickbooks.api.intuit.com';  
  }
      }
if(!empty(self::$api_timeout)){
    $this->timeout=self::$api_timeout;
}

  }
  
  /**
  * Get New Access Token from quickbooks
  * @param  array $form_id Form Id
  * @param  array $info (optional) QuickBooks Credentials of a form
  * @param  array $posted_form (optional) Form submitted by the user,In case of API error this form will be sent to email
  * @return array  QuickBooks API Access Informations
  */
public function get_token($info=""){
  if(!is_array($info)){
  $info=$this->info;
  }
  if(!isset($info['refresh_token']) || empty($info['refresh_token'])){
   return $info;   
  }
  $client=$this->client_info(); 
   $dev_key=base64_encode($client['client_id'].':'.$client['client_secret']);
  $header=array("Authorization"=>' Basic ' . $dev_key,'Content-Type'=>'application/x-www-form-urlencoded');
  ////////it is oauth    
  $body=array("grant_type"=>"refresh_token","refresh_token"=>$info['refresh_token']);
$body=http_build_query($body);
    $token_url='https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';  
  $re=$this->post_crm('',$token_url,"post",$body,$header);
 //var_dump($re);
 // $re=json_decode($res,true); 
  if(isset($re['access_token']) && $re['access_token'] !=""){ 
  $info["access_token"]=$re['access_token'];
  $info['refresh_expires_in']=$this->post('x_refresh_token_expires_in',$re);
  $info['expires_in']=$this->post('expires_in',$re);
  $info['refresh_token']=$this->post('refresh_token',$re);
//  $info["org_id"]=$re['id'];
  $info["class"]='updated';
  $info['token_time']=time();
  $token=$info;
  }else{
      $error='';
      if(isset($re['error_description']) && !empty($re['error_description'])){
          $error=$re['error_description'];
      }else if(!empty($re['error'])){
        $error=$re['error'];  
      }
      if(!empty($info['refresh_token'])){
          $error.=' - Refresh Token='.$info['refresh_token'].' - Expiry Date='.date('F d, Y h:i:s A',$info['token_time']+$info['refresh_expires_in']);
      }
  $info['error']=$error;
  $info['access_token']="";
  $info["class"]='error';
  $token=array(array('errorCode'=>'406','message'=>$error));
  }
   $this->info=$info;
  //update quickbooks info 
  //got new token , so update it in db
  $this->update_info( array("data"=> $info),$info['id']); 
  return $info; 
}
public function handle_code(){
      $info=$this->info;
      $id=$info['id'];

        $client=$this->client_info();
  $log_str=$res=""; $token=array();
  
//  $meta=$this->post_crm('','https://developer.api.intuit.com/.well-known/openid_configuration','','');
//  $meta=json_decode($meta,true);
  $token_url='https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
  if(!empty($meta['token_endpoint'])){ $token_url=$meta['token_endpoint']; }
  
  $dev_key=base64_encode($client['client_id'].':'.$client['client_secret']);
  $header=array("Authorization"=>' Basic ' . $dev_key);
  
  $realmid=$this->post('realmId'); 
  if(isset($_REQUEST['code'])){
  $code=$this->post('code');   
    
  if(!empty($code)){
      $env='login';
      if(!empty($_REQUEST['vx_env']) || !empty($info['env'])){
       $env='test'; $info['env']='test';  
      }
  $body=array("redirect_uri"=>$client['call_back'],"grant_type"=>"authorization_code","code"=>$code);
$body=http_build_query($body);
  $token=$this->post_crm('',$token_url,"post",$body,$header);
 // var_dump($res,$client['client_id'],$client['client_secret'],$token_url,$code); die();
   //$token=json_decode($res,true); 
  }
  if(isset($_REQUEST['error'])){
   $token['error_description']=$this->post('error_description');   
  }
  }else{  
  $res=$this->post_crm('','https://developer.api.intuit.com/v2/oauth2/tokens/revoke','post',array('token'=>$info['refresh_token']),$header);
 // var_dump($res,$info); die();  
  }
  $info['refresh_expires_in']=$this->post('x_refresh_token_expires_in',$token);
  $info['expires_in']=$this->post('expires_in',$token);
  $info['access_token']=$this->post('access_token',$token);
  $info['client_id']=$client['client_id'];
  $info['token_url']=$token_url;
  $info['_id']=$this->post('id',$token);
  $info['refresh_token']=$this->post('refresh_token',$token);
  $info['issued_at']=time();
  $info['token_time']=time();
  $info['error']=$this->post('error_description',$token);
  $info['api']="api";
  $info['realmid']=$realmid;
  $info["class"]='error';
  if(!empty($info['access_token'])){
  $info["class"]='updated';
  }
  $this->info=$info;
 // var_dump($info);
 // $info=$this->validate_api($info);
  $this->update_info( array('data'=> $info) , $id); 
  return $info;
}
/**
  * Posts data to quickbooks, Get New access token on expiration message from quickbooks
  * @param  string $path quickbooks path 
  * @param  string $method CURL method 
  * @param  array $body (optional) if you want to post data
  * @return array QuickBooks Response array
  */
public  function post_crm_arr($path,$method='get',$body="",$head=array()){
  $info=$this->info;    
  $get_token=false; 
if(!isset($info['realmid']) || empty($info['realmid'])){
    return array(array( 'errorCode'=>'2005' , 'message'=>__('No Access to QuickBooks API - 2005','gravity-forms-quickbooks-crm')));
}
  $url=$this->url.'/v3/company/'.$info['realmid'].'/'.$path.'?minorversion=75'; //using minor versions is optional. it is better to stick to one version
  if($method == 'delete'){
     $url.='&operation=delete';
     $method='post'; 
  }
  if($method == 'get' && !empty($body)){
    $url.='&'.http_build_query($body);  $body='';
    $head['Content-Type']='text/plain';
  }
  
  if(isset($info['token_time'])){
   $expiry=$info['token_time']+$info['expires_in']-4;
   if($expiry < time()){
      $info=$this->get_token();        
   }   
  }
 /// var_dump($method,$body,$head); die();
  $dev_key=isset($info['access_token']) ? $info['access_token'] : ''; 
  $qbooks_res=$this->post_crm($dev_key,$url,$method,$body,$head); 
  //$qbooks_response=json_decode($qbooks_res,true); 
  if(isset($qbooks_res['fault']['type']) && $qbooks_res['fault']['type'] == "AUTHENTICATION" && $qbooks_res['fault']['error'][0]['code'] == '3200'){ 
  $get_token=true;         
  }else if(empty($dev_key) && !empty($info['refresh_token'])){
     $get_token=true;  
  }
  if($get_token){ 
  ////////////try to get new token
  $token=$this->get_token();     
  if(isset($token['access_token'])&& $token['access_token']!=""){
  $dev_key=$token['access_token'];     
$qbooks_res=$this->post_crm($dev_key,$url,$method,$body,$head); 
//$qbooks_response=json_decode($qbooks_res,true); 
  }
  }
  $this->api_res=$qbooks_res; 
  return $qbooks_res;   
  }
/**
  * Posts data to quickbooks
  * @param  string $dev_key Slesforce Access Token 
  * @param  string $path QuickBooks Path 
  * @param  string $method CURL method 
  * @param  string $body (optional) if you want to post data 
  * @return string QuickBooks Response JSON
  */
public function post_crm($dev_key,$path,$method,$body="",$head=''){  
$header=array('Accept'=>'application/json');
if(!empty($dev_key)){
$header['Authorization']='Bearer ' . $dev_key; 
}

  if(is_array($body)&& count($body)>0)
  { 
      $body=json_encode($body);
      $header['Content-Type']='application/json'; 
  }
  if(!empty($head) && is_array($head)){ $header=array_merge($header,$head);  }
  
  $response = wp_remote_post( $path, array(
  'method' => strtoupper($method),
  'timeout' => $this->timeout,
  'headers' => $header,
  'body' => $body
  )
  ); 

  if(!is_wp_error($response)){
 $body= isset($response['body']) ? $response['body'] : "";
$body=json_decode($body,true);
 
  if(empty($body) && isset($response['response']) && is_array($response['response'])){
   $body=$response['response'];   
  }
   if($method == 'put'){ 
//var_dump($response,$header,$body,$path); //die();
  }
  }else{
      $body=array('wp_error'=>$response->get_error_message());
  }
  return $body; 
  }
/**
  * Get QuickBooks Client Information
  * @param  array $info (optional) QuickBooks Client Information Saved in Database
  * @return array QuickBooks Client Information
  */
public function client_info(){
      $info=$this->info;
  $client_id=$client_secret=$call_back='';
  //custom app
  if(is_array($info)){
      if( $this->post('app_id',$info) !="" && $this->post('app_secret',$info) !="" && $this->post('app_url',$info) !=""){
     $client_id=$this->post('app_id',$info);     
     $client_secret=$this->post('app_secret',$info);     
     $call_back=$this->post('app_url',$info);     
      }
  }
  return array("client_id"=>$client_id,"client_secret"=>$client_secret,"call_back"=>$call_back);
  }
 public function test(){
     $path='customer/58';
     //$path='query';
     $body=array('FamilyName'=>'johnx','GivenName'=>'Lewis','PrimaryEmailAddr'=>array('Address'=>'bioinfo35@gmail.com'));
     $q="select * from Customer Where PrimaryEmailAddr = 'bioifno35@gmail.com'";
     $q="select * from Customer Where FamilyName = 'john'"; //QueryResponse -> Customer -> Id
     $body['sparse']=true;
     $body['SyncToken']='0';
     $body['Id']='58'; 
     //array('query'=>$q)
  $res=$this->get_token();
  echo json_encode($res);
  die();  
 } 
  /**
  * Get fields from quickbooks
  * @param  string $form_id Form Id
  * @param  array $form (optional) Form Settings 
  * @param  array $request (optional) custom array or $_REQUEST 
  * @return array QuickBooks fields
  */
public function get_crm_fields($object,$is_options=false){ 
 //skipping =     "BillWithParent": false,     "BalanceWithJobs": 0,
//boolean =  Taxable , Job , IsProject ,Active 
$json=array();
$json['customer']='{
    "GivenName": "First Name",
    "FamilyName": "Last Name",
    "FullyQualifiedName": "Fully Qualified Name",
    "CompanyName": "Company Name",
    "DisplayName": "Display Name",
    "PrintOnCheckName": "Print On Check Name",
    "PrimaryPhone_FreeFormNumber": "Phone Number",
    "PrimaryEmailAddr_Address": "Email Address",
    "WebAddr_URI": "URL",
    "ShipAddr_City": "Shipping City",
    "ShipAddr_Line1": "Shipping Line1",
    "ShipAddr_CountrySubDivisionCode": "Shipping State",
    "ShipAddr_PostalCode": "Shipping Postal Code", 
    "ShipAddr_Country": "Shipping Country", 
    "BillAddr_City": "Billing City",
    "BillAddr_Line1": "Billing Line1",
    "BillAddr_CountrySubDivisionCode": "Billing State",
    "BillAddr_PostalCode": "Billing Postal Code", 
    "BillAddr_Country": "Billing Country", 
    "Notes": "Notes",
    "Job": "Job",
    "Taxable": "Taxable",
    "Balance": "Balance",
    "CurrencyRef_value": "Currency",
    "PreferredDeliveryMethod": "Preferred Delivery Method",
    "IsProject": "Is Project",
    "domain": "Domain",
    "GSTIN": "GSTIN",
    "Mobile_FreeFormNumber": "Mobile Number",
    "GSTRegistrationType": "GST Registration Type",
    "TaxExemptionReasonId": "Tax Exemption Reason Id",
    "PrimaryTaxIdentifier": "Primary Tax Identifier",
    "Id": "ID (Do not map this field in feed)",
    "Active": "Active"
}'; 
// "PrintStatus": "NeedToPrint",  "EmailStatus": "NotSet",  
//boolean=ApplyTaxAfterDiscount
$json['estimate']='{ 
    "BillEmail_Address": "Billing Email", 
    "TxnDate": "Date", 
    "TotalAmt": "Total Amount",
    "DocNumber": "Doc Number", 
    "domain": "Domain", 
    "CustomerMemo": "Customer Memo", 
    "ShipAddr_City": "Shipping City",
    "ShipAddr_Line1": "Shipping Line1",
    "ShipAddr_CountrySubDivisionCode": "Shipping State",
    "ShipAddr_PostalCode": "Shipping Postal Code", 
    "ShipAddr_Country": "Shipping Country", 
     "BillAddr_City": "Billing City",
    "BillAddr_Line1": "Billing Line1",
    "BillAddr_CountrySubDivisionCode": "Billing State",
    "BillAddr_PostalCode": "Billing Postal Code", 
    "BillAddr_Country": "Billing Country", 
    "ApplyTaxAfterDiscount": "Apply Tax After Discount", 
    "CustomField_1": "Custom Field 1",  
    "CustomField_2": "Custom Field 2",  
    "CustomField_3": "Custom Field 3",  
    "CustomField_4": "Custom Field 4",  
    "CustomField_5": "Custom Field 5",  
    "Id": "ID (Do not map this field in feed)", 
    "TxnTaxDetail_TotalTax": "Total Tax",
    "vx_shipping_line": "Shipping Total",
    "vx_shipping_line_sku": "Quickbooks Item SKU for shipping as line item",
    "vx_shipping_line_id": "Quickbooks Item ID for shipping as line item",
    "vx_discount_line": "Discount",
    "PrivateNote":"Private Note",
    "ClassRef_value":"Transaction Class",
    "DepartmentRef_value":"Department Ref",
    "CurrencyRef_value": "Currency Ref",
    "ExchangeRate": "Exchange Rate",
    "DepositToAccountRef_value": "Deposit To Account",
    "TransactionLocationType":{"label":"Transaction Location Type","eg":"WithinFrance,FranceOverseas,OutsideFranceWithEU,OutsideEU"},
    "GlobalTaxCalculation":{"label":"Global Tax Calculation","options":["TaxExcluded","TaxInclusive","NotApplicable"]},
    "PrintStatus":{"label":"Print Status","options":["NotSet","NeedToPrint","PrintComplete"]},
    "CustomerRef": "Customer"
}'; //    "TxnSource":"Transaction Source",
//ProcessPayment
$json['payment']='{ 
"DepositToAccountRef_value": "Deposit To Account", 
"PaymentRefNum": "Payment Ref Num", 
"TxnDate": "Date", 
"TotalAmt": "Total Amount", 
"ProcessPayment": "Process Payment", 
"CurrencyRef_value": "Currency Ref",
"CustomerRef": "Customer",
"PrivateNote": "Private Note",
"PaymentMethodRef_value": "Payment Method Ref",
"TransactionLocationType":{"label":"Transaction Location Type","eg":"WithinFrance,FranceOverseas,OutsideFranceWithEU,OutsideEU"},
"domain": "Domain"
}';
$json['item']='{ 
"Name": "Name", 
"QtyOnHand": "Qty On Hand", 
"Sku": "Sku", 
"Description": "Description", 
"UnitPrice": "Unit Price", 
"Taxable": "Taxable",
"InvStartDate": "Inventory Start Date",  
"SalesTaxIncluded": "Sales Tax Included", 
"TrackQtyOnHand": "Track Qty On Hand", 
"ServiceType": "Service Type", 
"SalesTaxCodeRef_value": "Sales Tax Code Ref",
"AssetAccountRef_value": "Asset Account Ref", 
"IncomeAccountRef_value": "Income Account Ref",
"TaxClassificationRef_value": "Tax Classification Ref",
"ExpenseAccountRef_value": "Expense Account Ref",
"PurchaseTaxCodeRef_value": "Purchase Tax Code Ref",
"ClassRef_value": "Class",
"PurchaseCost": "Purchase Cost",
"PurchaseDesc": "Purchase Desc",
"PurchaseTaxIncluded": "Purchase Tax Included",
"Type":{"label":"Item Type","options":["Inventory","Service","NonInventory"]},
"ItemCategoryType":{"label":"Item Category Type","options":["Service","Product"]},
"domain": "Domain"
}';

$bool=array('ApplyTaxAfterDiscount','Taxable','Job','IsProject','Active','ProcessPayment','SalesTaxIncluded','TrackQtyOnHand','Taxable','PurchaseTaxIncluded');
$req=array('PrimaryEmailAddr_Address','Name','Type'); //,'CustomerRef'
$search=array('GivenName','FamilyName','FullyQualifiedName','PrimaryEmailAddr_Address','DocNumber','DisplayName','Name','Sku','PaymentRefNum'); //,'BillEmail_Address','PrivateNote'
$date=array('ExpirationDate','TxnDate','AcceptedDate','ShipDate_date','InvStartDate');
$lookups=array('DepositToAccountRef','CustomerRef');

$arr=array('FamilyName'=>'Last Name','GivenName'=>'First Name','FullyQualifiedName'=>'Fully Qualified Name','DisplayName'=>'Display Name','PrintOnCheckName'=>'Print On Check Name','CompanyName'=>'Company Name','PrimaryPhone_FreeFormNumber'=>'Primary Phone','PrimaryEmailAddr_Address'=>'Primary Email','WebAddr_URI'=>'Web URL','BillAddr_Line1'=>'Billing Line 1','BillAddr_City'=>'Billing City','BillAddr_Country'=>'Billing Country','BillAddr_CountrySubDivisionCode'=>'Billing State','BillAddr_PostalCode'=>'Billing PostalCode','ShipAddr_Line1'=>'Shipping Line 1','ShipAddr_City'=>'Shipping City','ShipAddr_Country'=>'Shipping Country','ShipAddr_CountrySubDivisionCode'=>'Shipping State','ShipAddr_PostalCode'=>'Shipping PostalCode','Notes'=>'Notes','Job'=>'Job','BillWithParent'=>'Bill With Parent','PreferredDeliveryMethod'=>'Preferred Delivery Method','IsProject'=>'Is Project','domain'=>'Domain');

$arr=array();
if( in_array($object,array('customer','payment','item'))){
  $arr=json_decode($json[$object],1);  
}else{
  $arr=json_decode($json['estimate'],1);    
}

if($object == 'refundreceipt'){
    $arr['PaymentRefNum']='Number for Payment Received';
    $arr['PaymentMethodRef_value']='Payment Method Ref';
    $arr['DepositToAccountRef_value']='Deposit To Account';
    $arr['PaymentType']=array('label'=>'Payment Type','options'=>array("Cash", "Check", "CreditCard","Other"));
      
}else if($object == 'salesreceipt'){
$arr["PaymentRefNum"]= "Payment Ref Num";
$arr["TrackingNum"]= "Tracking Num";
///$arr["Deposit"]= "Deposit";
}else if($object == 'estimate'){
  $arr['AcceptedDate']='Accepted Date';   
  $arr['ExpirationDate']='Expiration Date';   
  $arr['ShipDate_date']='Shipping Date';   
  $arr['TrackingNum']='Tracking Number';
  $arr['SalesTermRef_value']='Term';
      $arr['TxnStatus']=array('label'=>'Txn Status','options'=>array("Accepted", "Closed", "Pending", "Rejected" ));   
}else if($object == 'invoice'){
    $arr['SalesTermRef_value']='Term';
 $arr["TrackingNum"]= "Tracking Num";  
 $arr["Deposit"]= "Deposit"; 
}else if($object == 'payment'){
       $arr['TxnStatus']=array('label'=>'Txn Status','options'=>array("PAID")); 
}
//$arr['EmailStatus']=array('label'=>'Email Status (Send or do not send email)','options_label'=>array('NotSet'=>'Do not Send', 'NeedToSend'=>'Yes, Send', 'EmailSent'=>'Email Already Sent'),'req'=>'true','type'=>'list');

  $fields=array();
  foreach($arr as $k=>$v){
     $type='text';
      if($k == 'PrimaryEmailAddr_Address'){
        $type='email';  
      }else 
       if( in_array($k,array('PrimaryPhone_FreeFormNumber','Mobile_FreeFormNumber'))){
        $type='phone';  
      }else
       if($k == 'WebAddr_URI'){
        $type='url';  
      }else if(in_array($k,$bool)){
          $type='boolean';
      }else if(in_array($k,$date)){
          $type='date';
      }else if(in_array($k,$lookups)){
          $type='lookup';
      }
   
      if(is_array($v)){
       $field=$v;   
      }else{
      $field=array('label'=>$v);    
      }
 
     if(!empty($field['options'])){
    $type='list';  
    $op=array();
    foreach($field['options'] as $kk=>$vv){
     $op[$vv]=$vv;
    }
    $field['options']=$op; 
     }
    if(!empty($field['options_label'])){
        $field['options']=$field['options_label'];
        unset($field['options_label']);
    }
      if($k == 'DepositToAccountRef_value'){
   $field['options']=$this->get_accounts('','refund');       
      } 
   if($k == 'IncomeAccountRef_value'){
   $field['options']=$this->get_accounts('income');       
      } 
      if($k == 'AssetAccountRef_value'){
   $field['options']=$this->get_accounts('asset');       
      }
      if($k == 'SalesTermRef_value'){
   $field['options']=$this->get_list('Term');       
      }  
      if(in_array($k,array('SalesTaxCodeRef_value','PurchaseTaxCodeRef_value')) ){
   $field['options']=$this->get_list('TaxCode');     
      } 
    $field['name']=$k; $field['type']=$type;  
    $fields[$k]=$field; 
    if(in_array($k,$req)){
       $fields[$k]['req']='true'; 
    } 
     if(in_array($k,$search)){
       $fields[$k]['search']='true'; 
    }
  }

  return $fields;
}
    
public function get_accounts($subtype='',$type=''){
    $types=array('asset'=>'Inventory','exp'=>'SuppliesMaterialsCogs','income'=>'SalesOfProductIncome');
    $q="select * from Account"; //Classification='Asset' AccountSubType='Inventory'   SuppliesMaterialsCogs = expense  , SalesOfProductIncome = income , Inventory=asset
    //$res=$this->post_crm_arr('query','get',array('query'=>$q)); var_dump($res); die();
if(!empty($types[$subtype])){
    $q.=" where AccountSubType='".$types[$subtype]."'";
}
if($type == 'refund'){
       $q.=" where AccountType in('Other Current Asset','Bank') "; 
}
if($type == 'discount'){
       $q.=" where   AccountSubType='DiscountsRefundsGiven' ";  //AccountType='AccountType' and
}
    $res=$this->post_crm_arr('query','get',array('query'=>$q)); ///QueryResponse,Account

$arr=array();
if(!empty($res['QueryResponse']['Account']) && is_array($res['QueryResponse']['Account']) ){
  foreach($res['QueryResponse']['Account']  as $v){
 $arr[$v['Id']]=$v['Name'];     
  }  
}else if(!empty($res['fault']['error'][0]['message'])){
    $arr=$res['fault']['error'][0]['message']; 
 }
return $arr;
}

     /**
  * Posts object to quickbooks, Creates/Updates Object or add to object feed
  * @param  array $entry_id Needed to update quickbooks response
  * @return array QuickBooks Response and Object URL
  */
public function push_object($object,$fields,$meta){

       
    /*
    $json='{"Name":"WooCommerce Zoho Pluginx","Type":"Inventory","QtyOnHand":50,"Sku":"vxg-zoho-maina","UnitPrice":10,"AssetAccountRef":{"value":162},"Description":"ccc","IncomeAccountRef":{"value":128},"TrackQtyOnHand":true,"InvStartDate":"2021-01-01"}';
    $json1='{
            "Name": "Second Prodyct Qbook xaaa22522d",
            "Sku": "sec-bookd",
            "Description": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            "Active": true,
            "UnitPrice": 52,
            "Type": "Inventory",
            "IncomeAccountRef": {
                "value": "128",
                "name": "Sales"
            },
            "AssetAccountRef": {
                "value": "162",
                "name": "Inventory Asset"
            },
            "TrackQtyOnHand": true,
            "QtyOnHand": 20,
            "InvStartDate": "2019-08-02"
        }';
    $post=json_decode($json,1);
   $res=$this->post_crm_arr('item','post',$post);
    var_dump($post,$res); die();
     $dep_line=array('DetailType'=>'DepositLineDetail','Amount'=>floatval(7));
 
          $dep_line['DepositLineDetail']=array('AccountRef'=>array('value'=>128));

   $dep_post=array('Line'=>array($dep_line));  

       $dep_post['DepositToAccountRef']=array('value'=>91);
 
// $arr=$this->post_crm_arr('deposit','post',$dep_post); 
//  var_dump($arr); die();
  // 
//$q='select * from Account';
$q='select * from SalesReceipt';
//$q='select * from Deposit';
$q='select * from Invoice';
$q='select * from Item';
$q='select * from Term';
//$q='select * from Estimate';
$search_res=$this->post_crm_arr('query','get',array('query'=>$q)); 
echo json_encode($search_res); die();*/
 
 //$res=$this->post_crm_arr('invoice/231');   
 //$res=$this->post_crm_arr('item/40');    var_dump($res); die();
 
  $fields_info=array();  $extra=$post=$qres=array();
  $id=$token=""; $note=array(); $error=""; $action=""; $link=""; $search=$search_response=$status=""; 
  $files=array();
  $debug = isset($_REQUEST['vx_debug']) && current_user_can('manage_options');

    $event=$this->post('event',$meta);
$objects_q=array('salesreceipt'=>'SalesReceipt','creditmemo'=>'CreditMemo','refundreceipt'=>'RefundReceipt');
if(isset($objects_q[$object])){
$obj_name=$objects_q[$object];    
}else{    
$obj_name=ucfirst($object);
}
  $fields_info=isset($meta['fields']) && is_array($meta['fields']) ? $meta['fields'] : array();

  //check primary key
  $search=array(); $search2=array();
  if( !empty($meta['primary_key'])){    
     $field=$meta['primary_key'];
 //   $search='580'; 
 //   $field='BillEmail';
 $q2='';

if($field == 'name'){
  $first=$last='';
   if(!empty($fields['GivenName']['value'])){
    $first=$fields['GivenName']['value'];   
   }
   if(!empty($fields['FamilyName']['value'])){
    $last=$fields['FamilyName']['value'];   
   }
 $q2="GivenName = '".esc_sql($first)."' and FamilyName = '".esc_sql($last)."'";    
}else if(!empty($fields[$meta['primary_key']]['value'])){
$search=$fields[$meta['primary_key']]['value'];  
 if($field == 'PrimaryEmailAddr_Address'){
     $field='PrimaryEmailAddr';
 }else if($field == 'PrimaryPhone_FreeFormNumber'){
     $field='PrimaryPhone';
 }  
 $field=str_replace('_','.',$field);
$q2=$field." = '".esc_sql($search)."'";
}  
if(!empty($q2)){
$q='select * from '.$object.' Where '.$q2; 
//$q='select * from Customer Where '.$field." = '".esc_sql($search)."'";
//$q='select * from estimate Where '.$field." = '".esc_sql($search)."'";
//$q='select * from Item';
//$q='select * from Account';
//$q='select * from SalesReceipt';
//$q='select * from Invoice';
//$q='select * from Estimate';
$search_res=$this->post_crm_arr('query','get',array('query'=>$q)); 
//var_dump($search_res,$q,$fields); die();

if(!empty($search_res['QueryResponse'][$obj_name][0]['Id'])){
  $id=$search_res['QueryResponse'][$obj_name][0]['Id'];
  $token=$search_res['QueryResponse'][$obj_name][0]['SyncToken'];
  if(!empty($search_res['QueryResponse'][$obj_name][0]['Notes'])){
    $note[]=$search_res['QueryResponse'][$obj_name][0]['Notes'];  
  }
}
 
      $extra["Search"]=$q;
      $extra["response"]=!empty($search_res) ? $search_res : $this->api_res;
  } }

  if(!empty($meta['crm_id'])){
   $id=$meta['crm_id'];   
  } 
     if(in_array($event,array('delete_note','add_note'))){    
  if(isset($meta['related_object'])){
    $extra['Note Object']= $meta['related_object'];
  }
  if(isset($meta['note_object_link'])){
    $extra['note_object_link']=$meta['note_object_link'];
  }
}

 $entry_exists=$sent=false; $lines=array();
$method='';
  //if($error ==""){
  if($id == ""){
  $action="Added";
if(empty($meta['new_entry'])){
    $sent=true;
if( isset($this->id) && $this->id == 'vxc_qbooks' && !in_array($object,array('payment','customer','item'))){
    
    $tax_id='';
    if(!empty($meta['tax_code_order'])){
        if($meta['tax_code_order'] == 'map'){ 
    if(method_exists(self::$_order,'get_tax_totals') && !empty($meta['tax_map'])){
       $taxes=self::$_order->get_tax_totals();
       if(!empty($taxes) && is_array($taxes)){
       $tax=reset($taxes); 
       $tax_id=array_search($tax->rate_id,$meta['tax_map']); 
       }
    }
}else{
    $tax_id=$meta['tax_code_order'];
}
if(!empty($tax_id)){
    $post['TxnTaxDetail']=array('TxnTaxCodeRef'=>array('value'=>$tax_id));
}}

   $order_res=$this->get_items($fields,$meta);   
  $res=$order_res['res']; 

  if(is_array($order_res['extra'])){
  $extra=array_merge($extra, $order_res['extra']);
  }
  if(!empty($res)){
       $tax_id=''; 
      foreach($res as $item_id=>$item){  
     $item_arr=array();      //'UnitPrice'=>$item['total'],
        $total=$item['total']*$item['qty'];
       
      if($item['item_type'] == 'Group'){
       $item_arr['Quantity']=$item['qty'];
       $item_arr['GroupItemRef']=array('value'=>$item['item_id']);
       $item_arr['Line']=array();
       if(!empty($item['group_items'])){
        foreach($item['group_items'] as $child){
            $child_item=array('ItemRef'=>array('value'=>$child['Id']),'Qty'=>$child['group_qty']);

            if(!empty($child['SalesTaxCodeRef']['value'])  || (isset($child['Taxable']) && $child['Taxable'] == true) ){
  if(!empty($item['tax_id'])){
                 $tax_id=$item['tax_id'];
                $child_item['TaxCodeRef']=array('value'=>$item['tax_id']);
            }
} 
            
          $item_arr['Line'][]=array('DetailType'=>'SalesItemLineDetail','SalesItemLineDetail'=>$child_item,'Amount'=>$child['group_qty']*$child['UnitPrice']);  
        }   
       }
 
       unset($item_arr['TaxCodeRef']);
       $line_item=array("DetailType"=> "GroupLineDetail",'GroupLineDetail'=>$item_arr);    
      }else{
          $item_arr['UnitPrice']=$item['total'];
          $item_arr['Qty']=$item['qty']; //ServiceDate
      
      if(!empty($meta['class'])){
          $item_arr['ClassRef']=array('value'=>$meta['class']);
      }    
              if( !empty($item['tax_id'])){ //removed $item['is_taxable'] && because some items are tax exempt (item is not taxable in QB but we can set "exempt" in feed) 
         $tax_id=$item['tax_id'];
        $item_arr['TaxCodeRef']=array('value'=>$item['tax_id']);
      }
      
          $item_arr['ItemRef']=array('value'=>$item['item_id']);
      $line_item=array("DetailType"=> "SalesItemLineDetail",'SalesItemLineDetail'=>$item_arr); 
      }
      $line_item['Amount']=$total;
      if(!empty($item['item_desc'])){
        $line_item['Description']=$item['item_desc'];
      }    if(!empty($item['service_date'])){
        $line_item['ServiceDate']=date('Y-m-d',strtotime($item['service_date']));
      }
     $lines[]=$line_item; //LineNum    
      }
      
    if(!empty($lines)){
    if(isset($fields['vx_shipping_line']['value'])){ 
    $ship_id='SHIPPING_ITEM_ID';   
    if(!empty($fields['vx_shipping_line_id']['value'])){ 
      $ship_id=$fields['vx_shipping_line_id']['value'];   
    }
    
    if(!empty($fields['vx_shipping_line_sku']['value'])){ 
      $ship_sku=$fields['vx_shipping_line_sku']['value'];
    $q="select * from Item Where ";
   $q.="Sku = '".esc_sql($ship_sku)."'";
$ship_res=$this->post_crm_arr('query','get',array('query'=>$q)); 

if(!empty($ship_res['QueryResponse']['Item'][0]['Id'])){
 $ship_id=$ship_res['QueryResponse']['Item'][0]['Id'];   
}   
    } 

  $ship_line=array("DetailType"=> "SalesItemLineDetail",'SalesItemLineDetail'=>array('ItemRef'=>array('value'=>$ship_id)),"Amount"=>(float)$fields['vx_shipping_line']['value']);  //LineNum 
  if( !empty($tax_id) && !empty($meta['ship_tax']) && $meta['ship_tax'] == 'apply_tax'){
  $ship_line['SalesItemLineDetail']['TaxCodeRef']=array('value'=>$tax_id);    
  }
  $lines[]=$ship_line;
    }
    if(!empty($fields['vx_discount_line']['value'])){    
 $dis_line=array("DetailType"=> "DiscountLineDetail","Amount"=>(float)$fields['vx_discount_line']['value'],'DiscountLineDetail'=>array());  //LineNum
 
 if(!empty($meta['dis_tax'])){
     $dis_line['DiscountLineDetail']['DiscountAccountRef']=array('value'=>$meta['dis_tax']);
 }  
 if(!empty($meta['class'])){
     $dis_line['DiscountLineDetail']['ClassRef']=array('value'=>$meta['class']);
 } 
  if( !empty($tax_id) && !empty($meta['ship_tax']) && $meta['ship_tax'] == 'apply_tax'){
  $dis_line['DiscountLineDetail']['TaxCodeRef']=array('value'=>$tax_id);    
  }
  $lines[]=$dis_line;
    }
        $post['Line']=$lines;
    }  
  }   
}
//var_dump($post,$fields['vx_discount_line']); die();
  $status="1"; $method='post';
   }else{
      $error='Entry does not exist';
  }
}else{ 
$entry_exists=true;
  if( in_array($event,array('delete'))){
   if( !in_array($object,array('customer')) ){  
  $action="Deleted";
  $res=$this->post_crm_arr($object.'/'.$id);
  $re=reset($res);
  if(!empty($re['Id'])){ $id=$re['Id'];
  $qres=$this->post_crm_arr($object,"delete",array('SyncToken'=>$re['SyncToken'],'Id'=>$re['Id']));
  $status="5"; 
  } 
  } }
  else{    
      
  $action="Updated";  $status="2";
  //update old object
   if(empty($meta['update'])){
  $method='post'; $post['Id']=$id; $post['SyncToken']=$token; $post['sparse']=true;

 }else{
  $method='';
 }
  }
  }

  if(!empty($method) && !empty($fields)){
      if(in_array($object,array('refundreceipt','salesreceipt')) && !empty($meta['refund_account'])){
$fields['DepositToAccountRef_value']=array('value'=>$meta['refund_account'],'label'=>'Deposit To');
 }
 if(!empty($meta['pay_method'])){
 $fields['PaymentMethodRef']=array('value'=>$meta['pay_method'],'label'=>'Payment Method');    
 }
$vals=array('CustomerMemo','PaymentMethodRef');
foreach($fields as $k=>$v){
     $field=isset($meta['fields'][$k]) ? $meta['fields'][$k] : array(); 
     $field_type=isset($field['type']) ? $field['type'] : ''; 
     
     if(in_array($k,array('vx_shipping_line','vx_shipping_line_id','vx_discount_line','vx_shipping_line_sku'))){ continue; }
     
     if($field_type == 'date'){
        $v['value']=date('Y-m-d',strtotime($v['value']));    
       } 
   if(strpos($k,'_') !== false ){
           $k_arr=explode('_',$k);
       if(!empty($k_arr[1])){
         if($k_arr[0] == 'CustomField'){
        $post['CustomField'][]=array("DefinitionId"=> $k_arr[1],"StringValue"=>strval($v['value']),'Type'=>'StringType');  
       }else{
       if($k_arr[1] == 'Country'){
        $v['value']=$this->get_country($v['value']);  
       }  
      $post[$k_arr[0]][$k_arr[1]]=$v['value'];     
       } }
   }else if($k == 'Notes' && !empty($v['value']) ){
        $disable_note=!empty($meta['disable_entry_note']) && !empty($id); 
        if(!$disable_note){  
       $note[]=$v['value'];
       $post['Notes']=implode("\n",$note);
        }
       }else if($field_type == 'lookup' || in_array($k,$vals)){
       $post[$k]=array('value'=>$v['value']);     
       }else if($k == 'Name' && $object == 'item'){
       $post[$k]=substr($v['value'],0,100);
       }else{ 
      $post[$k]=$v['value'];      
        }   
}

if( $status == '2' && !empty($post['TxnTaxDetail'])){
  unset($post['TxnTaxDetail']); //QB does not accept tax without line items
}
  
if(!empty($post['TxnTaxDetail'])){
    $fields['txn_tax']=array('value'=>$post['TxnTaxDetail'],'label'=>'Transaction Tax');
}
if(!empty($lines)){
    $fields['lines']=array('value'=>$lines,'label'=>'Lines');
}


// add payment line in payment object for invoice
//$post['Line']=array(array('Amount'=>'20','LinkedTxn'=>array('TxnId'=>$id,'TxnType'=>'Invoice')));

 $qres=$this->post_crm_arr($object,$method,$post);   
// var_dump($post,$qres); die();
 //
 if(is_array($qres) && !empty($qres)){
     if(isset($qres['Id'])){
 $id=$qres['Id'];
 }else if(!empty($qres['fault']['error'][0]['detail'])){
    $error=$qres['fault']['error'][0]['detail']; 
 }else{ 
     $qre=reset($qres);
      if(!empty($qre['Id'])){
    $id=$qre['Id'];  
 }
 }

 }
    if(!empty($id)){
     if(!empty($meta['send_email'])){
     $res=$this->post_crm_arr($object.'/'.$id.'/send','post');
     $re=reset($res);
     if(!empty($re['Id'])){
     $extra['Sending Email']='Sent to '.$re['Id'];  
     }else{
    $extra['Sending Email']=$res;     
     }
     }   
     if(!empty($this->info['ap_url'])){
       $link=trailingslashit($this->info['ap_url']).'app/';

       if($object == 'customer'){ 
       $link.='customerdetail?nameId='.$id; 
       }else{
           $object_link=$object;
       $links=array('payment'=>'recvpayment'); 
       if(isset($links[$object_link])){  $object_link=$links[$object_link]; }   
        $link.=$object_link.'?txnId='.$id;   
       }
       
     }
  if(!empty($fields['Deposit']['value'])){
      $dep_line=array('DetailType'=>'DepositLineDetail','Amount'=>floatval($fields['Deposit']['value']));
      if(!empty($meta['income_account'])){
          $dep_line['DepositLineDetail']=array('AccountRef'=>array('value'=>$meta['income_account']));
      }
   $dep_post=array('Line'=>array($dep_line));  
   if(!empty($meta['asset_account'])){
       $dep_post['DepositToAccountRef']=array('value'=>$meta['asset_account']);
   }
 //$extra['Deposit Response']=$this->post_crm_arr('deposit','post',$dep_post);     
  }   
 }else{
     if(!empty($qres['Fault']['Error'][0]['Message'])){
 $error=$qres['Fault']['Error'][0]['Message'];
 $id='';    
 }
 $status='';  
 } 
  }
//  var_dump($post,$qres,$method,$fields,$status); die();

  return array("error"=>$error,"id"=>$id,"link"=>$link,"action"=>$action,"status"=>$status,"data"=>$fields,"response"=>$qres,"extra"=>$extra);
}

public function get_items($post, $meta){ 
/*
    $product=new WC_Product(12418);
  //  $product_simple=new WC_Product(10438);
    $res=wc_get_related_products($product->get_id(), 5, $product->get_upsell_ids());
    var_dump($res); die();*/
      $_order=self::$_order;

     $items=$_order->get_items();   $extra=$re=array(); 
     $products=array();  
     $k=0; 
     if(is_array($items) && count($items)>0){
      foreach($items as $item_id=>$item){
        $line_desc=array(); $product_id='';
   $product=null;  
       if(method_exists($item,'get_product')){
  // $p_id=$v->get_product_id();  
   $product=$item->get_product();
       }
        if(!$product){ continue; }
        
        $sku=$product->get_sku(); 
   $product_id=$product->get_id();
   $parent_id=$product->get_parent_id();
   $name=$item->get_name();
   
if(empty($sku)){ $sku=$product_id; }

if(!empty($parent_id)  ){ //&& !isset($products[$parent_id])
         $product_simple=new WC_Product($parent_id);
         $parent_sku=$product_simple->get_sku(); 
         if($sku == $parent_sku){
           //  $sku=$parent_sku.'-'.$product_id;
         }
/*$k++;  
$name=$product_simple->get_name();       
$arr=$this->books_item($k,$parent_id,$parent_sku,$name,$product_simple,$item,$meta);   
if(!empty($arr['extra'])){ $extra=array_merge($extra,$arr['extra']); }   
if(!empty($arr['re']['item_id'])){ $re[$arr['re']['item_id']]=$arr['re']; $products[$parent_id]=$arr['re']; }   
*/ 

     // append variation names ,  $item->get_name() does not support more than 3 variation names
          $attrs=$product->get_attributes(); //$item->get_formatted_meta_data( '' )
            $var_info=array(); 
             if(is_array($attrs) && count($attrs)>0){
                 
             $name=$product->get_title();    
                 foreach($attrs as $attr_key=>$attr_val){
                    // $att_name=wc_attribute_label($attr_key,$product);
                     $term = get_term_by( 'slug', $attr_val, $attr_key ); 
                 if ( taxonomy_exists( $attr_key ) ) {
                $term = get_term_by( 'slug', $attr_val, $attr_key );
                if ( ! is_wp_error( $term ) && is_object( $term ) && $term->name ) {
                    $attr_val = $term->name;
                }    
            }
            if(!empty($attr_val)){
            $var_info[]=$attr_val;
            }    
                 }
             } 
          if(!empty($var_info)){
          $name.=' '.implode(', ',$var_info);    
          }  
}

$parent=array();
/*
if(isset($products[$parent_id]['sku'])){
$parent=$products[$parent_id];   
    if($products[$parent_id]['sku'] == $sku){
             $sku.='-'.$product_id;
         }
}*/ 
   
$k++;

$arr=$this->books_item($k,$product_id,$sku,$name,$product,$item,$meta,$parent);

if(!empty($arr['extra'])){ $extra=array_merge($extra,$arr['extra']); }   
if(!empty($arr['re']['item_id'])){
$item_arr=$arr['re']; 

if(!empty($meta['tax_code'])){
if($meta['tax_code'] == 'map'){    
$item_tax=$item->get_taxes(); 
if(!empty($item_tax['total']) && !empty($meta['tax_map'])){
$tax_ids=$item_tax['total'];
$tax_class=$item->get_tax_class();
if(empty($tax_class)){ $tax_class='standard'; }
    $tax_ids+=array($tax_class=>'tax Class'); 
    foreach($tax_ids as $tax_id=>$tax_val){  //$tax_val is empty , if tax amount is "-" in woo order
        $tax_rate=array_search($tax_id,$meta['tax_map']);
        if( $tax_rate && $tax_val !=''){ 
         $item_arr['tax_id']=$tax_rate;   
            break;
        }
    }   
} }else{
 $item_arr['tax_id']=$meta['tax_code'];  
}
}
if(!empty($meta['item_desc'])){
    $item_arr['item_desc']=$this->process_tags($meta['item_desc'],$item);
}
if(!empty($meta['service_date'])){
    $item_arr['service_date']=$this->process_tags($meta['service_date'],$item);
}
$re[]=$item_arr; 
}  

     } }
//var_dump($meta['tax_map'],$re); die('-------------');
  return array('res'=>$re,'extra'=>$extra);
}

 
public function books_item($k,$product_id,$sku,$name,$product,$item,$meta,$parent=array()){
$unit_price=$product->get_price();

$total=$item->get_total();
$qty= $item->get_quantity();
$tax= $item->get_total_tax();
$_order=self::$_order;
  if(method_exists($_order,'get_item_total')){
       $total=$_order->get_item_subtotal($item,false,true);
    }
$extra=$re=array();
$product_name=$product->get_title(); //disabled @ jun-24 , variations may have same SKU , change name for each variation , create new item in QB for each variation
$product_name=$name;
$product_name=substr($product_name,0,100);
$q="select * from Item Where ";
if(empty($meta['item_match'])){
   $q.="Sku = '".esc_sql($sku)."'";
   $extra['Search SKU '.$k]=$sku;
}else{
   $q.="Name = '".esc_sql($product_name)."'"; 
   $extra['Search name '.$k]=$product_name; 
}

$extra['Search Product '.$k]=$res=$this->post_crm_arr('query','get',array('query'=>$q));  
$is_taxable=false; $group_items=array();
$item_id=$item_type='';
if(!empty($res['QueryResponse']['Item'][0]['Id'])){
    $item0=$res['QueryResponse']['Item'][0];
$item_id=$item0['Id']; 
$item_type=$item0['Type'];  
//if( (isset($item0['Taxable']) && $item0['Taxable'] == true) || isset($item0['SalesTaxIncluded']) && $item0['SalesTaxIncluded'] == true ){
if(!empty($item0['SalesTaxCodeRef']['value'])  || (isset($item0['Taxable']) && $item0['Taxable'] == true) ){
 $is_taxable=true;   
} 
if($item_type == 'Group' && !empty($item0['ItemGroupDetail']['ItemGroupLine'])){
$childs=array();
foreach($item0['ItemGroupDetail']['ItemGroupLine'] as $vv){
    if(!empty($vv['ItemRef']['value'])){
   $childs[$vv['ItemRef']['value']]=$vv['Qty'];     
    }
}
    $q="select * from Item Where id in ('".implode("','",array_keys($childs))."')";
   $res=$this->post_crm_arr('query','get',array('query'=>$q)); 
   if(!empty($res['QueryResponse']['Item'][0]['Id'])){
       foreach($res['QueryResponse']['Item'] as $kk){
        $kk['group_qty']=$childs[$kk['Id']];
           $group_items[]=$kk;      
       }
    
   }
}

}else{
    
    $post=array('Name'=>$product_name,'Sku'=>$sku,'UnitPrice'=>$unit_price,'Type'=>'NonInventory');
    $post['Taxable']=$is_taxable=$product->is_taxable();
   if(!empty($meta['item_type'])){
       $post['Type']=$meta['item_type'];
    if($product->managing_stock() && $meta['item_type'] == 'Inventory' ){
        $post['InvStartDate']=isset(self::$order['_order_date']) ? date('Y-m-d',strtotime(self::$order['_order_date'])) : date('Y-m-d');
        $post['TrackQtyOnHand']=true;
        $post['QtyOnHand']=$product->get_stock_quantity();
         if(!empty($meta['asset_account'])){
        $post['AssetAccountRef']=array('value'=>$meta['asset_account']);
    }
    }
   }
    if(!empty($meta['exp_account'])){
        $post['ExpenseAccountRef']=array('value'=>$meta['exp_account']);
    }
   
    if(!empty($meta['income_account'])){
        $post['IncomeAccountRef']=array('value'=>$meta['income_account']);
    }
    if(!empty($parent['item_id'])){
        $post['ParentRef']=array('value'=>$parent['item_id']);
        $post['SubItem']=true;
    }
$extra['Product Post '.$k]=$post;    
$extra['create Product '.$k]=$res=$this->post_crm_arr('item','post',$post);
//var_dump($res,$post); die();
 if(!empty($res['Item']['Id'])){
    $item_id=$res['Item']['Id']; 
 }   
}
$re=array('name'=>$name,'item_id'=>$item_id,'item_type'=>$item_type,'sku'=>$sku,'qty'=>$qty,'total'=>$total,'tax'=>$tax,'price'=>$unit_price,'product_id'=>$product_id,'is_taxable'=>$is_taxable,'group_items'=>$group_items);
return array('re'=>$re,'extra'=>$extra);
}
public function get_list($table){
$q='select * From '.$table;
//$q='select * From TaxCode';
//$q='select * From Class';
$res=$this->post_crm_arr('query','get',array('query'=>$q));
//var_dump($res); // die();
$arr=array();
if(!empty($res['QueryResponse'][$table])){
 foreach($res['QueryResponse'][$table] as $v){
  $arr[$v['Id']]=$v['Name'];   
 }   
}
return $arr;
}
public function get_country($country){
if(strlen($country) == 2){
$json='{"AF":"AFG","AX":"ALA","AL":"ALB","DZ":"DZA","AS":"ASM","AD":"AND","AO":"AGO","AI":"AIA","AQ":"ATA","AG":"ATG","AR":"ARG","AM":"ARM","AW":"ABW","AU":"AUS","AT":"AUT","AZ":"AZE","BS":"BHS","BH":"BHR","BD":"BGD","BB":"BRB","BY":"BLR","BE":"BEL","BZ":"BLZ","BJ":"BEN","BM":"BMU","BT":"BTN","BO":"BOL","BQ":"BES","BA":"BIH","BW":"BWA","BV":"BVT","BR":"BRA","IO":"IOT","BN":"BRN","BG":"BGR","BF":"BFA","BI":"BDI","CV":"CPV","KH":"KHM","CM":"CMR","CA":"CAN","KY":"CYM","CF":"CAF","TD":"TCD","CL":"CHL","CN":"CHN","CX":"CXR","CC":"CCK","CO":"COL","KM":"COM","CG":"COG","CD":"COD","CK":"COK","CR":"CRI","CI":"CIV","HR":"HRV","CU":"CUB","CW":"CUW","CY":"CYP","CZ":"CZE","DK":"DNK","DJ":"DJI","DM":"DMA","DO":"DOM","EC":"ECU","EG":"EGY","SV":"SLV","GQ":"GNQ","ER":"ERI","EE":"EST","SZ":"SWZ","ET":"ETH","FK":"FLK","FO":"FRO","FJ":"FJI","FI":"FIN","FR":"FRA","GF":"GUF","PF":"PYF","TF":"ATF","GA":"GAB","GM":"GMB","GE":"GEO","DE":"DEU","GH":"GHA","GI":"GIB","GR":"GRC","GL":"GRL","GD":"GRD","GP":"GLP","GU":"GUM","GT":"GTM","GG":"GGY","GN":"GIN","GW":"GNB","GY":"GUY","HT":"HTI","HM":"HMD","VA":"VAT","HN":"HND","HK":"HKG","HU":"HUN","IS":"ISL","IN":"IND","ID":"IDN","IR":"IRN","IQ":"IRQ","IE":"IRL","IM":"IMN","IL":"ISR","IT":"ITA","JM":"JAM","JP":"JPN","JE":"JEY","JO":"JOR","KZ":"KAZ","KE":"KEN","KI":"KIR","KP":"PRK","KR":"KOR","KW":"KWT","KG":"KGZ","LA":"LAO","LV":"LVA","LB":"LBN","LS":"LSO","LR":"LBR","LY":"LBY","LI":"LIE","LT":"LTU","LU":"LUX","MO":"MAC","MG":"MDG","MW":"MWI","MY":"MYS","MV":"MDV","ML":"MLI","MT":"MLT","MH":"MHL","MQ":"MTQ","MR":"MRT","MU":"MUS","YT":"MYT","MX":"MEX","FM":"FSM","MD":"MDA","MC":"MCO","MN":"MNG","ME":"MNE","MS":"MSR","MA":"MAR","MZ":"MOZ","MM":"MMR","NA":"NAM","NR":"NRU","NP":"NPL","NL":"NLD","NC":"NCL","NZ":"NZL","NI":"NIC","NE":"NER","NG":"NGA","NU":"NIU","NF":"NFK","MK":"MKD","MP":"MNP","NO":"NOR","OM":"OMN","PK":"PAK","PW":"PLW","PS":"PSE","PA":"PAN","PG":"PNG","PY":"PRY","PE":"PER","PH":"PHL","PN":"PCN","PL":"POL","PT":"PRT","PR":"PRI","QA":"QAT","RE":"REU","RO":"ROU","RU":"RUS","RW":"RWA","BL":"BLM","SH":"SHN","KN":"KNA","LC":"LCA","MF":"MAF","PM":"SPM","VC":"VCT","WS":"WSM","SM":"SMR","ST":"STP","SA":"SAU","SN":"SEN","RS":"SRB","SC":"SYC","SL":"SLE","SG":"SGP","SX":"SXM","SK":"SVK","SI":"SVN","SB":"SLB","SO":"SOM","ZA":"ZAF","GS":"SGS","SS":"SSD","ES":"ESP","LK":"LKA","SD":"SDN","SR":"SUR","SJ":"SJM","SE":"SWE","CH":"CHE","SY":"SYR","TW":"TWN","TJ":"TJK","TZ":"TZA","TH":"THA","TL":"TLS","TG":"TGO","TK":"TKL","TO":"TON","TT":"TTO","TN":"TUN","TR":"TUR","TM":"TKM","TC":"TCA","TV":"TUV","UG":"UGA","UA":"UKR","AE":"ARE","GB":"GBR","US":"USA","UM":"UMI","UY":"URY","UZ":"UZB","VU":"VUT","VE":"VEN","VN":"VNM","VG":"VGB","VI":"VIR","WF":"WLF","EH":"ESH","YE":"YEM","ZM":"ZMB","ZW":"ZWE"}';
$arr=json_decode($json,true);
$country=strtoupper($country);
if(isset($arr[$country])){
 $country=$arr[$country];   
}
return $country;        
 }
 return $country;
}
public function get_item($sku){

$q="select * from Item Where Sku = '".esc_sql($sku)."'";
$res=$this->post_crm_arr('query','get',array('query'=>$q)); 
$item=array();
if(!empty($res['QueryResponse']['Item'][0]['Id'])){
$item=$res['QueryResponse']['Item'][0];  
}
return $item;
}
public function get_entry($object,$id){
  return $this->post_crm_arr($object.'/'.$id,"get");     
}

    
}
}
?>