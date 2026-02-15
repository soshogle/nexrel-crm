<?php
if ( ! defined( 'ABSPATH' ) ) {
     exit;
 }  
 $dis=''; $dev_app=apply_filters('vxc_qbooks_developer_app', array('client_id'=>'ABdYeOCC2zgBh2gWSZekcrDdN6IYRPStfVP7W5R8MdwEXXO3V0','client_secret'=>'lLu7bTjwJG6l7qKnFPAEK68vzaNh3kJvVTn324DI'));
 if(  !empty($info['access_token'])){ $dis='disabled="disabled"'; }                                       
 ?><h3><?php echo sprintf(__("Account ID# %d",'wp-woocommerce-quickbooks'),esc_attr($id));
if($new_account_id != $id){
 ?> <a href="<?php echo esc_url($new_account); ?>" title="<?php esc_html_e('Add New Account','wp-woocommerce-quickbooks'); ?>" class="add-new-h2"><?php esc_html_e("Add New Account",'wp-woocommerce-quickbooks'); ?></a> 
 <?php
}
$name=$this->post('name',$info);    
 ?>
 <a href="<?php echo esc_url($link) ?>" class="add-new-h2" title="<?php esc_html_e('Back to Accounts','wp-woocommerce-quickbooks'); ?>"><?php esc_html_e('Back to Accounts','wp-woocommerce-quickbooks'); ?></a></h3>
  <div class="crm_fields_table">
    <div class="crm_field">
  <div class="crm_field_cell1"><label for="vx_name"><?php esc_html_e("Account Name",'wp-woocommerce-quickbooks'); ?></label>
  </div>
  <div class="crm_field_cell2">
  <input type="text" name="crm[name]" value="<?php echo !empty($name) ? esc_attr($name) : 'Account #'.$id; ?>" id="vx_name" class="crm_text">

  </div>
  <div class="clear"></div>
  </div>
       <div class="crm_field">
  <div class="crm_field_cell1">
  <label for="vx_env"><?php esc_html_e('Environment','wp-woocommerce-quickbooks'); ?></label>
  </div>
  <div class="crm_field_cell2">
<select name="crm[env]" class="crm_text" id="vx_env" data-save="no" <?php echo $dis; ?> >
  <?php $envs=array(''=>__('Production','wp-woocommerce-quickbooks'),'test'=>__('Sandbox','wp-woocommerce-quickbooks'));
if(!isset($info['env']) ){ $info['env']=''; }
  foreach($envs as $k=>$v){
    $sel='';
if($info['env'] == $k){ $sel='selected="selected"'; }
echo '<option value="'.$k.'" '.$sel.'>'.$v.'</option>';
}
 ?>
 </select>
  </div>
  <div class="clear"></div>
  </div>

     <div class="crm_field">
  <div class="crm_field_cell1"><label for="ap_url"><?php esc_html_e("Quickbooks URL",'wp-woocommerce-quickbooks'); ?></label>
  </div>
  <div class="crm_field_cell2">
  <input type="text" name="crm[ap_url]" placeholder="https://c26.qbo.intuit.com" <?php echo $dis; ?> required value="<?php echo $this->post('ap_url',$info); ?>" id="ap_url" class="crm_text">
<span class="howto"><?php esc_html_e("Login your Quickbooks account , copy part of URL from browser e.g https://c26.qbo.intuit.com ",'wp-woocommerce-quickbooks'); ?></span>
  </div>
  <div class="clear"></div>
  </div>
  
    <div class="crm_field">
  <div class="crm_field_cell1"><label for="app_id"><?php esc_html_e("Client ID",'wp-woocommerce-quickbooks'); ?></label></div>
  <div class="crm_field_cell2">
     <div class="vx_tr">
  <div class="vx_td">
  <input type="password" id="app_id" name="crm[app_id]" class="crm_text" <?php echo $dis; ?> required placeholder="<?php esc_html_e("Client ID",'wp-woocommerce-quickbooks'); ?>" value="<?php echo esc_attr($this->post('app_id',$info)); ?>">
    <div class="howto"><?php echo sprintf(__('CRM Perks developer app for Quickbooks %s evironment, Premium version app works with Quickbooks %s evironment ','wp-woocommerce-quickbooks'),'<code>Sandbox</code>','<code>Production</code>'); ?></div>
      <ul style="margin-top: 2px; margin-left: 20px; list-style: disc;">
  <li><?php echo __('Client ID : ','wp-woocommerce-quickbooks').$dev_app['client_id']; ?></li>
  <li><?php echo __('Client Secret :  ','wp-woocommerce-quickbooks').$dev_app['client_secret']; ?></li>
  <li><?php echo __('Redirect URI : https://www.crmperks.com/sf_auth ','wp-woocommerce-quickbooks'); ?></li>
   </ul>
  </div><div class="vx_td2">
  <a href="#" class="button vx_toggle_btn vx_toggle_key" title="<?php esc_html_e('Toggle Consumer Key','wp-woocommerce-quickbooks'); ?>"><?php esc_html_e('Show Key','wp-woocommerce-quickbooks') ?></a>
  
  </div></div>
  
      <div class="howto">
  <ol>
  <li><?php echo sprintf(__('Sign In to your Quickbooks Developer Account %shere%s','wp-woocommerce-quickbooks'),'<a href="https://developer.intuit.com" target="_blank">','</a>'); ?></li>
  <li><?php echo sprintf(__('Create New APP %shere%s','wp-woocommerce-quickbooks'),'<a href="https://developer.intuit.com/app/developer/myapps" target="_blank">','</a>'); ?></li>
  <li><?php esc_html_e('Enter Client Name(eg. My App) and Select "Accounting" Scope and Create APP','wp-woocommerce-quickbooks'); ?></li>
  <li><?php esc_html_e('Go to Keys & Oauth , if you are using quickbooks sandbox then copy Development key otherwise copy Production Keys','wp-woocommerce-quickbooks'); ?></li>
  <li><?php echo sprintf(__('Enter %s or %s in Redirect URI','wp-woocommerce-quickbooks'),'<code>https://www.crmperks.com/sf_auth</code>','<code>'.$link."&".$this->id.'_tab_action=get_code</code>'); ?>
  </li>
<li><?php esc_html_e('Save APP then copy client ID and Secret and put both in plugin settings','wp-woocommerce-quickbooks'); ?></li>
 <li><?php echo sprintf(__('You can see screenshots %shere%s','wp-woocommerce-quickbooks'),'<a href="https://www.crmperks.com/woocommerce-quickbooks/" target="_blank">','</a>'); ?></li>
   </ol>
  </div>
  
</div>
  <div class="clear"></div>
  </div>
  
  
  
  
     <div class="crm_field">
  <div class="crm_field_cell1"><label for="app_secret"><?php esc_html_e("Client Secret",'wp-woocommerce-quickbooks'); ?></label></div>
  <div class="crm_field_cell2">
       <div class="vx_tr" >
  <div class="vx_td">
 <input type="password" id="app_secret" name="crm[app_secret]"  class="crm_text" <?php echo $dis; ?> required  placeholder="<?php esc_html_e("Client Secret",'wp-woocommerce-quickbooks'); ?>" value="<?php echo esc_attr($this->post('app_secret',$info)); ?>">
  </div><div class="vx_td2">
  <a href="#" class="button vx_toggle_btn vx_toggle_key" title="<?php esc_html_e('Toggle Consumer Secret','wp-woocommerce-quickbooks'); ?>"><?php esc_html_e('Show Key','wp-woocommerce-quickbooks') ?></a>
  
  </div></div>
  </div>
  <div class="clear"></div>
  </div>
       <div class="crm_field">
  <div class="crm_field_cell1"><label for="app_url"><?php esc_html_e("Redirect URI",'wp-woocommerce-quickbooks'); ?></label></div>
  <div class="crm_field_cell2"><input type="text" id="app_url" name="crm[app_url]" <?php echo $dis; ?> required class="crm_text" placeholder="<?php esc_html_e("QuickBooks Redirect URI",'wp-woocommerce-quickbooks'); ?>" value="<?php echo esc_attr($this->post('app_url',$info)); ?>"> 
  </div>
  <div class="clear"></div>
  </div>
  
  <div class="crm_field">
  <div class="crm_field_cell1"><label><?php esc_html_e('QuickBooks Access','wp-woocommerce-quickbooks'); ?></label></div>
  <div class="crm_field_cell2">
  <?php  if(isset($info['access_token'])  && $info['access_token']!="") {
  ?>
  <div style="padding-bottom: 8px;" class="vx_green"><i class="fa fa-check"></i> <?php
  $msg=sprintf(__("Authorized Connection to %s on %s",'wp-woocommerce-quickbooks'),'<code>QuickBooks</code>',date('F d, Y h:i:s A',$info['token_time']));
          if(!empty($info['refresh_expires_in'])){
       $msg.= ' - Token Expiry is '.date('F d, Y h:i:s A ',$info['refresh_expires_in']+$info['token_time']).' UTC';
   }
   echo $msg;
        ?></div>
  <?php
  }else if(!empty($client['client_id']) && !empty($client['client_secret']) ){
      $redir=$link."&".$this->id."_tab_action=get_token&id=".$id."&vx_nonce=".$nonce;
        if(!empty($info['env'])){ $redir.='&vx_env=test'; }
  $test_link='https://appcenter.intuit.com/app/connect/oauth2?response_type=code&state='.urlencode($redir).'&client_id='.$client['client_id'].'&scope=com.intuit.quickbooks.accounting&redirect_uri='.urlencode($client['call_back']);  
  ?>
  <a class="button button-default button-hero sf_login" id="vx_login_btn" data-id="<?php echo esc_html($client['client_id']) ?>" href="<?php echo $test_link ?>"> <i class="fa fa-lock"></i> <?php esc_html_e("Connect QuickBooks",'wp-woocommerce-quickbooks'); ?></a>
<?php
$error='';
if(!empty($info['error'])){
   $error=$info['error']; 
} 
  if(!empty($error)){
 ?><div style="border-left: 4px solid #d00000; background: #fff; padding: 12px; margin-top: 12px;"><i class="fa fa-times"></i> <?php echo $error; ?></div><?php   
}
  }else{
    ?><strong><?php esc_html_e("Please Save Client ID , Secret and Redirect URI First",'wp-woocommerce-quickbooks'); ?></strong><?php  
  }
 if(!empty($_GET['vx_debug'])){
 ?><div style="border-left: 4px solid #d00000; background: #fff; padding: 12px; margin-top: 12px;"> <?php echo json_encode($info); ?></div><?php     
  }
    
  ?></div>
  <div class="clear"></div>
  </div>                  
    <?php if(isset($info['access_token'])  && $info['access_token']!="") {
  ?>
    <div class="crm_field">
  <div class="crm_field_cell1"><label><?php esc_html_e("Revoke Access",'wp-woocommerce-quickbooks'); ?></label></div>
  <div class="crm_field_cell2">  <a class="button button-secondary" id="vx_revoke" href="<?php echo esc_url($link."&".$this->id."_tab_action=get_token&vx_nonce=".$nonce.'&id='.$id);?>"><i class="fa fa-unlock"></i> <?php esc_html_e("Revoke Access",'wp-woocommerce-quickbooks'); ?></a>
  </div>
  <div class="clear"></div>
  </div> 
      <div class="crm_field">
  <div class="crm_field_cell1"><label><?php esc_html_e("Test Connection",'wp-woocommerce-quickbooks'); ?></label></div>
  <div class="crm_field_cell2">      <button type="submit" class="button button-secondary" name="vx_test_connection"><i class="fa fa-refresh"></i> <?php esc_html_e("Test Connection",'wp-woocommerce-quickbooks'); ?></button>
  </div>
  <div class="clear"></div>
  </div> 
  <?php
    }
  ?>
  <div class="crm_field">
  <div class="crm_field_cell1"><label for="vx_error_email"><?php esc_html_e("Notify by Email on Errors",'wp-woocommerce-quickbooks'); ?></label></div>
  <div class="crm_field_cell2"><textarea name="crm[error_email]" id="vx_error_email" placeholder="<?php esc_html_e("Enter comma separated email addresses",'wp-woocommerce-quickbooks'); ?>" class="crm_text" style="height: 70px"><?php echo isset($info['error_email']) ? esc_attr($info['error_email']) : ""; ?></textarea>
  <span class="howto"><?php esc_html_e("Enter comma separated email addresses. An email will be sent to these email addresses if an order is not properly added to QuickBooks. Leave blank to disable.",'wp-woocommerce-quickbooks'); ?></span>
  </div>
  <div class="clear"></div>
  </div>  


  <button type="submit" value="save" class="button-primary" title="<?php esc_html_e('Save Changes','wp-woocommerce-quickbooks'); ?>" name="save"><?php esc_html_e('Save Changes','wp-woocommerce-quickbooks'); ?></button>  
  </div>  
<?php
/*
//$res=$api->post_crm_arr('invoices'); 
$q='select * from Invoice';
$res=$api->post_crm_arr('query','get',array('query'=>$q)); 
echo json_encode($res); die();
*/
if(!empty($info['access_token']) && self::$is_pr){ 

if(empty($meta['tax_codes']) || !empty($_POST['vx_refresh_tax'])){
$tax_codes=$api->get_list('TaxCode'); 
$meta['tax_codes']=$tax_codes;
  if(isset($info['id'])){
$this->update_info( array("meta"=>$meta) , $info['id'] );
} }
?>
<h3 style="margin-top: 60px"><?php esc_html_e('Map WooCommerce Tax Rates to Quickbooks Tax Codes','wp-woocommerce-quickbooks'); ?></h3>
<p><?php echo __('In case of multiple taxes, please create a tax group in Quickbooks and map first priority WooCommerce tax rate to Quickbooks Tax Group.','wp-woocommerce-quickbooks'); ?> </p>
  
<div class="crm_fields_table">
<div class="crm_field">
  <div class="crm_field_cell1"><label><?php esc_html_e('Quickboos Tax Codes ','wp-woocommerce-quickbooks'); ?></label></div>
  <div class="crm_field_cell2">
  <button type="submit" class="button button-secondary" name="vx_refresh_tax" value="yes"><i class="fa fa-refresh"></i> <?php esc_html_e('Refresh Tax Codes','wp-woocommerce-quickbooks'); ?></button>
  </div>
<div class="clear"></div>
</div>
  
<?php
if(!empty($meta['tax_codes'])){
 $tax_class=get_option('woocommerce_tax_display_cart');   
// $tax_class=get_option('woocommerce_tax_classes');   
 $woo_rates=array();
// $tax_classes=WC_Tax::get_tax_classes();
 $tax_classes=wc_get_product_tax_class_options();
 if(is_array($tax_classes) && !empty($tax_classes)){
     $tax_classes=array('standard'=>'')+$tax_classes;
 foreach($tax_classes as $tax_k=>$tax_name){
     
  $woo_arr=WC_Tax::get_rates_for_tax_class($tax_name); 
  if(!empty($woo_arr)){
      if(empty($tax_name)){ $tax_name='Standard'; }
    $woo_rates[$tax_k]=$tax_name.' - Class';
      foreach($woo_arr as $tax){
            if($tax->tax_rate_priority < 2){
       $woo_rates[$tax->tax_rate_id]=$tax->tax_rate_name.' '.trim($tax->tax_rate_country.' '.$tax->tax_rate_state);  
            } 
      }
  }  
 }
 }
 
 
 // var_dump($woo_rates,$tax_class);
 $tax_map=!empty($meta['tax_map']) ? $meta['tax_map'] : array();
foreach($meta['tax_codes'] as $k=>$v){    
 ?>
<div class="crm_field">
  <div class="crm_field_cell1"><label><?php echo $v ?></label></div>
  <div class="crm_field_cell2">
<select name="tax[<?php echo esc_attr($k) ?>]" class="crm_text">
<option value=""><?php esc_html_e('Select WooCommerce Tax Rate ','wp-woocommerce-quickbooks'); ?></option>
<?php 
if(!empty($woo_rates)){
  foreach($woo_rates as $tax_k=>$tax){
    $sel='';
if(!empty($tax_map[$k]) && $tax_map[$k]  == $tax_k){ $sel='selected="selected"'; }
echo '<option value="'.$tax_k.'" '.$sel.'>'.$tax.'</option>';
} }
 ?>
 </select>
  </div>
<div class="clear"></div>
</div> 
 <?php   
} }
?>
   <button type="submit" value="save" class="button-primary" title="<?php esc_html_e('Save Changes','wp-woocommerce-quickbooks'); ?>" name="save_tax"><?php esc_html_e('Save Tax Codes','wp-woocommerce-quickbooks'); ?></button> 
    </div>
<?php
}
 ?> 
 

  <script type="text/javascript">

  jQuery(document).ready(function($){
        $('#vx_env').change(function(){
   var btn=$('#vx_login_btn');
   var link=btn.attr('data-login');   
  if($(this).val() == 'test'){
    link=btn.attr('data-test');   
  }
  btn.attr('href',link);
  });

  $(".vx_tabs_radio").click(function(){
  $(".vx_tabs").hide();   
  $("#tab_"+this.id).show();   
  }); 
$(".sf_login").click(function(e){
    if($("#vx_custom_app_check").is(":checked")){
    var client_id=$(this).data('id');
    var new_id=$("#app_id").val();
    if(client_id!=new_id){
          e.preventDefault();   
     alert("<?php esc_html_e('QuickBooks Client ID Changed.Please save new changes first','wp-woocommerce-quickbooks') ?>");   
    }    
    }
})
  $("#vx_custom_app_check").click(function(){
     if($(this).is(":checked")){
         $("#vx_custom_app_div").show();
     }else{
            $("#vx_custom_app_div").hide();
     } 
  });
    $(document).on('click','#vx_revoke',function(e){
  
  if(!confirm('<?php esc_html_e('Notification - Remove Connection?','wp-woocommerce-quickbooks'); ?>')){
  e.preventDefault();   
  }
  })   
  })
  </script>  