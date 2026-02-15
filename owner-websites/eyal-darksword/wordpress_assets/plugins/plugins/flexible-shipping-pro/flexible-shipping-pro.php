<?php
/**
 * Plugin Name: Flexible Shipping PRO
 * Plugin URI: https://octol.io/fs-plugin-site
 * Description: Extends the free version of Flexible Shipping by adding advanced pro features.
 * Version: 2.15.3
 * Author: Octolize
 * Author URI: https://octol.io/fs-author
 * Text Domain: flexible-shipping-pro
 * Domain Path: /lang/
 * Requires at least: 5.8
 * Tested up to: 6.1
 * WC requires at least: 7.0
 * WC tested up to: 7.4
 * Requires PHP: 7.2
 *
 * Copyright 2017 WP Desk Ltd.
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 *
 * @package Flexible Shipping Pro
 */

/* THIS VARIABLE CAN BE CHANGED AUTOMATICALLY */
$plugin_version = '2.15.3';

$plugin_name        = 'WooCommerce Flexible Shipping PRO';
$plugin_class_name  = 'WPDesk_Flexible_Shipping_Pro_Plugin';
$plugin_text_domain = 'flexible-shipping-pro';
$product_id         = 'WooCommerce Flexible Shipping PRO';
$plugin_file        = __FILE__;
$plugin_dir         = __DIR__;
$plugin_shops       = [
	'pl_PL'   => 'https://www.wpdesk.pl/',
	'default' => 'https://octolize.com/',
];

define( 'FLEXIBLE_SHIPPING_PRO_VERSION', $plugin_version );
define( $plugin_class_name, $plugin_version );

$requirements = [
	'php'          => '5.6',
	'wp'           => '4.5',
	'repo_plugins' => [
		[
			'name'      => 'woocommerce/woocommerce.php',
			'nice_name' => 'WooCommerce',
			'version'   => '4.8',
		],
		[
			'name'      => 'flexible-shipping/flexible-shipping.php',
			'nice_name' => 'Flexible Shipping',
			'version'   => '2.1',
		],
	],
];

require __DIR__ . '/vendor_prefixed/wpdesk/wp-plugin-flow-common/src/plugin-init-php52.php';
