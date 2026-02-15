<?php

/**
 * Astra theme compatibility Class
 *
 * @since 4.6.11
 */
class Iconic_WooThumbs_Compat_Astra {
	/**
	 * Init.
	 */
	public static function run() {
		$theme = wp_get_theme();

		if ( $theme->template !== 'astra' ) {
			return;
		}

		add_action( 'astra_woo_qv_product_image', array( __CLASS__, 'remove_qv_images' ), 0 );
		add_action( 'astra_woo_qv_product_image', array( __CLASS__, 'add_qv_images' ), 20 );
	}

	/**
	 * Remove QV images.
	 */
	public static function remove_qv_images() {
		if ( ! class_exists( 'ASTRA_Ext_WooCommerce_Markup' ) ) {
			return;
		}

		remove_action( 'astra_woo_qv_product_image', array( ASTRA_Ext_WooCommerce_Markup::get_instance(), 'qv_product_images_markup' ), 20 );
	}

	/**
	 * Add WooThumbs gallery to QV.
	 */
	public static function add_qv_images() {
		$styles = apply_filters( 'iconic_woothumbs_astra_qv_styles', array(
			'#ast-quick-view-modal .iconic-woothumbs-all-images-wrap' => array(
				'width' => '100%',
			),
			'#ast-quick-view-modal .ast-oembed-container'             => array(
				'padding'  => 0,
				'position' => 'absolute',
				'top'      => 0,
				'left'     => 0,
				'bottom'   => 0,
				'right'    => 0,
			),
		) );
		?>
		<div class="images" style="max-width: 488px;">
			<?php echo do_shortcode( '[woothumbs-gallery]' ); ?>
			<script type="text/javascript">
				jQuery( 'body' ).trigger( 'jckqv_open' );
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
}
