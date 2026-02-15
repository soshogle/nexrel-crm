<?php
/**
 * Plugin Name: Extra Product Options Builder for WooCommerce
 * Plugin URI: https://productbuilder.rednao.com/getit/
 * Description: Create extra options to each of your products
 * Author: RedNao
 * Author URI: http://rednao.com
 * Version: 1.2.155
 * Text Domain: rednaowooextraproduct
 * Domain Path: /languages/
 * Network: true
 * License: GPLv3
 * License URI: http://www.gnu.org/licenses/gpl-3.0
 * Slug: additional-product-fields-for-woocommerce
 */


use rednaowooextraproduct\core\Loader;

spl_autoload_register('rednaowooextraproduct');
function rednaowooextraproduct($className)
{
    if(strpos($className,'rednaowooextraproduct\\')!==false)
    {
        $NAME=basename(\dirname(__FILE__));
        $DIR=dirname(__FILE__);
        $path=substr($className,21);
        $path=str_replace('\\','/', $path);
        require_once $DIR.$path.'.php';
    }
}


$loader=new Loader(__FILE__,'rednaowooextraproduct',__FILE__,array(
    'ItemId'=>15,
    'Author'=>'Edgar Rojas',
    'UpdateURL'=>'https://productbuilder.rednao.com',
    'FileGroup'=>'ProductBuilder'
));



