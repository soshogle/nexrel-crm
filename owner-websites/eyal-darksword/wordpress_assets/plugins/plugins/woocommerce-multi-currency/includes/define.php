<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
define( 'WOOMULTI_CURRENCY_DIR', WP_PLUGIN_DIR . DIRECTORY_SEPARATOR . "woocommerce-multi-currency" . DIRECTORY_SEPARATOR );
define( 'WOOMULTI_CURRENCY_ADMIN', WOOMULTI_CURRENCY_DIR . "admin" . DIRECTORY_SEPARATOR );
define( 'WOOMULTI_CURRENCY_TEMPLATES', WOOMULTI_CURRENCY_DIR . "templates" . DIRECTORY_SEPARATOR );
define( 'WOOMULTI_CURRENCY_FRONTEND', WOOMULTI_CURRENCY_DIR . "frontend" . DIRECTORY_SEPARATOR );
define( 'WOOMULTI_CURRENCY_WIDGETS', WOOMULTI_CURRENCY_FRONTEND . "widgets" . DIRECTORY_SEPARATOR );
define( 'WOOMULTI_CURRENCY_LANGUAGES', WOOMULTI_CURRENCY_DIR . "languages" . DIRECTORY_SEPARATOR );
define( 'WOOMULTI_CURRENCY_INCLUDES', WOOMULTI_CURRENCY_DIR . "includes" . DIRECTORY_SEPARATOR );
define( 'WOOMULTI_CURRENCY_PLUGINS', WOOMULTI_CURRENCY_DIR . "plugins" . DIRECTORY_SEPARATOR );
$plugin_url = plugins_url( '', __FILE__ );
$plugin_url = str_replace( '/includes', '', $plugin_url );
define( 'WOOMULTI_CURRENCY_CSS', $plugin_url . "/css/" );
define( 'WOOMULTI_CURRENCY_CSS_DIR', WOOMULTI_CURRENCY_DIR . "css" . DIRECTORY_SEPARATOR );
define( 'WOOMULTI_CURRENCY_JS', $plugin_url . "/js/" );
define( 'WOOMULTI_CURRENCY_JS_DIR', WOOMULTI_CURRENCY_DIR . "js" . DIRECTORY_SEPARATOR );
define( 'WOOMULTI_CURRENCY_IMAGES', $plugin_url . "/images/" );
define( 'WOOMULTI_CURRENCY_FLAG', WOOMULTI_CURRENCY_IMAGES . "flag/" );


/*Include functions file*/
if ( is_file( WOOMULTI_CURRENCY_INCLUDES . "data.php" ) ) {
	require_once WOOMULTI_CURRENCY_INCLUDES . "data.php";
}

if ( is_file( WOOMULTI_CURRENCY_INCLUDES . "functions.php" ) ) {
	require_once WOOMULTI_CURRENCY_INCLUDES . "functions.php";
}
/*Include functions file*/
if ( is_file( WOOMULTI_CURRENCY_INCLUDES . "check_update.php" ) ) {
	require_once WOOMULTI_CURRENCY_INCLUDES . "check_update.php";
}
if ( is_file( WOOMULTI_CURRENCY_INCLUDES . "update.php" ) ) {
	require_once WOOMULTI_CURRENCY_INCLUDES . "update.php";
}
if ( is_file( WOOMULTI_CURRENCY_INCLUDES . "support.php" ) ) {
	require_once WOOMULTI_CURRENCY_INCLUDES . "support.php";
}
if ( is_file( WOOMULTI_CURRENCY_INCLUDES . 'elementor/elementor.php' ) ) {
	require_once WOOMULTI_CURRENCY_INCLUDES . 'elementor/elementor.php';
}
if ( is_file( WOOMULTI_CURRENCY_INCLUDES . 'import-export/export-csv.php' ) ) {
	require_once WOOMULTI_CURRENCY_INCLUDES . 'import-export/export-csv.php';
}
if ( is_file( WOOMULTI_CURRENCY_INCLUDES . 'import-export/general.php' ) ) {
	require_once WOOMULTI_CURRENCY_INCLUDES . 'import-export/general.php';
}
if ( is_file( WOOMULTI_CURRENCY_INCLUDES . 'import-export/import-csv.php' ) ) {
	require_once WOOMULTI_CURRENCY_INCLUDES . 'import-export/import-csv.php';
}
vi_include_folder( WOOMULTI_CURRENCY_ADMIN, 'WOOMULTI_CURRENCY_Admin_' );
vi_include_folder( WOOMULTI_CURRENCY_WIDGETS, 'WOOMULTI_CURRENCY_Widget_' );
vi_include_folder( WOOMULTI_CURRENCY_PLUGINS, 'WOOMULTI_CURRENCY_Plugin_' );

if ( ! is_admin() || ( defined( 'DOING_AJAX' ) && DOING_AJAX ) ) {
	vi_include_folder( WOOMULTI_CURRENCY_FRONTEND, 'WOOMULTI_CURRENCY_Frontend_' );
}