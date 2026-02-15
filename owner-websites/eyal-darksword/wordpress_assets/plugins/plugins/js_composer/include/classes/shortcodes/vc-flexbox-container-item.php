<?php
/**
 * Class that handles specific [vc_flexbox_container_item] shortcode.
 *
 * @see js_composer/include/templates/shortcodes/vc_flexbox_container_item.php
 *
 * @since 8.7
 */

if ( ! defined( 'ABSPATH' ) ) {
	die( '-1' );
}

require_once vc_path_dir( 'SHORTCODES_DIR', 'vc-container-item-base.php' );

/**
 * Class WPBakeryShortCode_Vc_Flexbox_Container_Item
 *
 * @since 8.7
 *
 * @package WPBakeryPageBuilder
 */
class WPBakeryShortCode_Vc_Flexbox_Container_Item extends WPBakeryShortCode_Vc_Container_Item_Base {
	/** Get item type label.
	 *
	 * @return string
	 * @since 8.7
	 */
	protected function getItemTypeLabel() {
		return __( 'Flexbox', 'js_composer' );
	}

	/**
	 * Get item class.
	 *
	 * @return string
	 * @since 8.7
	 */
	protected function getItemClass() {
		return 'vc_flexbox_container_item';
	}
}
