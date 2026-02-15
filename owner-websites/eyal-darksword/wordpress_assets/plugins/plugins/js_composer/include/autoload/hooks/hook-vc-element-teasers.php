<?php
/**
 * Initialize element teasers preloading on admin_init.
 *
 * @since 8.7
 */

if ( ! defined( 'ABSPATH' ) ) {
	die( '-1' );
}

/**
 * Initialize element teasers preloading on admin_init.
 *
 * Only runs in admin area for users with WPBakery access.
 * Preloads teasers data to cache so editor load is not delayed by API calls.
 *
 * @since 8.7
 */
function wpb_element_teasers_admin_init() {
	if ( ! is_admin() ) {
		return;
	}

	if ( ! vc_user_access()->part( 'shortcodes' )->can()->get() ) {
		return;
	}

	// Load teasers class file if not already loaded.
	if ( ! class_exists( 'WPB_Element_Teasers' ) ) {
		require_once vc_path_dir( 'EDITORS_DIR', 'popups/class-vc-element-teasers.php' );
	}

	// Preload teasers (will fetch from API if cache is empty/expired).
	if ( class_exists( 'WPB_Element_Teasers' ) ) {
		$teasers_manager = new WPB_Element_Teasers();
		$teasers_manager->preload_teasers();
	}
}

add_action( 'admin_init', 'wpb_element_teasers_admin_init' );
