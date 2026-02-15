<?php
// Exit if accessed directly
if( !defined( 'ABSPATH' ) ) exit;

if( !class_exists( 'vx_crmperks_wc' )):
class vx_crmperks_wc{
public function __construct(){ 
add_action( 'add_meta_boxes', array($this,'add_meta_box') ); 
}

public function add_meta_box(){

        $screen='shop_order';
      if ( class_exists( 'Automattic\WooCommerce\Utilities\OrderUtil' ) && Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled() ) {
              $screen=wc_get_page_screen_id( 'shop-order' );      //woocommerce_page_wc-orders
                }
                
    add_meta_box(
            'vx-user-info', //$id
            __( 'Marketing Data','crmperks-addons' ), //$title
            array( $this, 'visitor_info_box' ), //$callback
            $screen, //$post_type
            'normal', //$context
            'default' //$priority
        );
  }
 
public function visitor_info_box($object){ 
    if(is_object($object)){
          if(method_exists($object,'get_id')){ 
          $order_id=$object->get_id();    
          }else if(isset($object->ID)){
            $order_id=$object->ID;     
          }
      } 

 $html_added=apply_filters('vx_addons_meta_box',false,$order_id,'wc');
if(!$html_added){
   ?> 
   <h3 style="text-align: center;"><?php _e('No Information Available','crmperks-addons')?></h3>
   <?php
}
}
}
$addons=new vx_crmperks_wc();
endif;
