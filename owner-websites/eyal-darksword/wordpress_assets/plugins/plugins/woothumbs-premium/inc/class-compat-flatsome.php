<?php

/**
 * Flatsome theme compatibility Class
 *
 * @since 4.6.18
 */
class Iconic_WooThumbs_Compat_Flatsome {
	/**
	 * Init.
	 */
	public static function run() {
		$theme = wp_get_theme();

		if ( $theme->template !== 'flatsome' ) {
			return;
		}

		add_filter( 'iconic_woothumbs_load_assets', '__return_true' );
		add_action( 'woocommerce_before_single_product_lightbox_summary', array( __CLASS__, 'add_qv_images' ), 0 );
		add_filter( 'do_shortcode_tag', array( __CLASS__, 'change_flatsome_gallery_output' ), 10, 3 );
		add_filter( 'iconic_woothumbs_bypass_get_gallery_image_ids', array( __CLASS__, 'allow_quickview_feature_to_get_gallery_image_ids' ) );
	}

	/**
	 * Add WooThumbs gallery to QV.
	 */
	public static function add_qv_images() {
		global $product, $iconic_woothumbs_class;

		$styles = apply_filters( 'iconic_woothumbs_flatsome_qv_styles', array(
			'.woothumbs-gallery-quick-view .iconic-woothumbs-all-images-wrap' => array(
				'width' => '100%',
			),
			'.woothumbs-gallery-quick-view .ast-oembed-container'             => array(
				'padding'  => 0,
				'position' => 'absolute',
				'top'      => 0,
				'left'     => 0,
				'bottom'   => 0,
				'right'    => 0,
			),
		) ); ?>
		<div class="woothumbs-gallery-quick-view" style="max-width: 488px;">
			<?php
			$iconic_woothumbs_class->show_product_images();
			$iconic_woothumbs_class->generate_variation_data( $product );
			?>
			<script type="text/javascript">
				// Remove the theme gallery
				jQuery( '.product-lightbox.lightbox-content .product-gallery-slider' ).remove();
				jQuery( '.product-lightbox.lightbox-content .iconic-woothumbs-images img:first' ).one( 'load', function(){
					jQuery( document.body ).trigger( 'jckqv_open' );
				} );
			</script>
			<?php if ( ! empty( $styles ) ) { ?>
				<style>
					<?php foreach( $styles as $property => $params ) { ?>
					<?php echo $property; ?> {
					<?php foreach( $params as $key => $value ) { ?>
					<?php echo $key; ?>: <?php echo $value; ?>;
					<?php } ?>
					}
					<?php } ?>
				</style>
			<?php } ?>
		</div>
		<?php
	}

	/**
	 * Replace output of [ux_product_gallery] shortcode with the output of WooThumbs.
	 *
	 * @param string $output The output of filter.
	 * @param string $tag    The shortcode tag.
	 * @param array  $attr   The Attributes.
	 *
	 * @return string $output The output returned after processing.
	 */
	public static function change_flatsome_gallery_output( $output, $tag, $attr ) {
		global $iconic_woothumbs_class;

		if ( 'ux_product_gallery' !== $tag ) {
			return $output;
		}

		ob_start();
		$iconic_woothumbs_class->show_product_images();
		return ob_get_clean();
	}

	/**
	 * Allow Flatsome's Quickview feature AJAX request to get gallery image IDs.
	 *
	 * @return void
	 */
	public static function allow_quickview_feature_to_get_gallery_image_ids() {
		return is_admin() && ( empty( $_REQUEST['action'] ) || 'flatsome_quickview' !== $_REQUEST['action'] );
	}
}
