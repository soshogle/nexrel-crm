<?php 
/*
 * Plugin Name: Clickship Shipping Rates
 * Plugin URI: https://info.clickship.com/
 * Description: Plugin to provides best shipping rates for your customers.
 * Version: 2.1
 * Author: Clickship
 *
 */


/**
 * Check if WooCommerce is active
 */
$active_plugins = apply_filters( 'active_plugins', get_option( 'active_plugins' ) );
if ( in_array( 'woocommerce/woocommerce.php', $active_plugins) ) {

 add_filter( 'woocommerce_shipping_methods', 'add_clickship_shipping_rates' );
 function add_clickship_shipping_rates( $methods ) {
   $methods[] = 'WC_Clickship_Shipping_Rates_Method';
   return $methods;
 }

 add_action( 'woocommerce_shipping_init', 'add_clickship_shipping_rates_init' );
 function add_clickship_shipping_rates_init(){
   require_once 'class-clickship-shipping-rates-method.php';
 }

}