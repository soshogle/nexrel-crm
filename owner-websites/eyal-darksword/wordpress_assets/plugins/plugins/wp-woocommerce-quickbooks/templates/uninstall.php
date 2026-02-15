<?php
if ( ! defined( 'ABSPATH' ) ) {
     exit;
 }                                            
 ?>  <h3><?php esc_html_e('Uninstall WooCommerce QuickBooks Plugin','wp-woocommerce-quickbooks'); ?></h3>
  <?php
  if(isset($_POST[$this->id.'_uninstall'])){ 
  ?>
  <div class="vxc_alert updated  below-h2">
  <h3><?php esc_html_e('Success','wp-woocommerce-quickbooks'); ?></h3>
  <p><?php esc_html_e('WooCommerce QuickBooks Plugin has been successfully uninstalled','wp-woocommerce-quickbooks'); ?></p>
  <p>
  <a class="button button-hero button-primary" href="plugins.php"><?php esc_html_e("Go to Plugins Page",'wp-woocommerce-quickbooks'); ?></a>
  </p>
  </div>
  <?php
  }else{
  ?>
  <div class="vxc_alert error below-h2">
  <h3><?php esc_html_e("Warning",'wp-woocommerce-quickbooks'); ?></h3>
  <p><?php esc_html_e('This Operation will delete all QuickBooks logs and feeds.','wp-woocommerce-quickbooks'); ?></p>
  <p><button class="button button-hero button-secondary" id="vx_uninstall" type="submit" onclick="return confirm('<?php esc_html_e("Warning! ALL QuickBooks Feeds and Logs will be deleted. This cannot be undone. OK to delete, Cancel to stop.", 'wp-woocommerce-quickbooks')?>');" name="<?php echo esc_attr($this->id) ?>_uninstall" title="<?php esc_html_e("Uninstall",'wp-woocommerce-quickbooks'); ?>" value="yes"><?php esc_html_e("Uninstall",'wp-woocommerce-quickbooks'); ?></button></p>
  </div>
  <?php
  } ?>