<?php
/**
 * Gallery template.
 *
 * This template displays the WooThumbs gallery.
 *
 * @var WC_Product $product
 * @var array $args
 *
 * @package iconic-woothumbs
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

global $product, $iconic_woothumbs_class;

// The `gallery_width` attribute comes from the block editor
// rendering the shortcode with additional parameters.
$inline_style               = ( ! empty( $args['attributes']['gallery_width'] ) ) ? 'max-width: ' . $args['attributes']['gallery_width'] . '%' : '';
$global_aspect_ratio        = Iconic_WooThumbs_Helpers::get_global_aspect_ratio();
$global_thumbs_aspect_ratio = Iconic_WooThumbs_Helpers::get_global_aspect_ratio( 'gallery_thumbnail' );

/**
 * Hook: iconic_woothumbs_before_all_images_wrap
 *
 * @param WC_Product $product WC Product object.
 * @param array      $args    Array of gallery arguments.
 */
do_action( 'iconic_woothumbs_before_all_images_wrap', $product, $args );
?>

	<div
		class="<?php echo esc_attr( implode( ' ', $args['classes'] ) ); ?>"
		data-showing="<?php echo esc_attr( $args['selected_product_id'] ); ?>"
		data-parentid="<?php echo esc_attr( $product->get_id() ); ?>"
		data-default="<?php echo filter_var( wp_json_encode( $args['default_images'] ), FILTER_SANITIZE_SPECIAL_CHARS ); ?>"
		data-slide-count="<?php echo is_countable( $args['images'] ) ? count( $args['images'] ) : 0; ?>"
		data-maintain-slide-index="<?php echo esc_attr( $args['maintain_slide_index'] ); ?>"
		data-product-type="<?php echo esc_attr( $product->get_type() ); ?>"
		data-global-aspect-ratio="<?php echo esc_attr( $global_aspect_ratio ); ?>"
		data-global-thumbs-aspect-ratio="<?php echo esc_attr( $global_thumbs_aspect_ratio ); ?>"
		dir="<?php echo is_rtl() ? 'rtl' : 'ltr'; ?>"
		style="<?php echo esc_attr( $inline_style ); ?>">

		<?php
		/**
		 * Hook: iconic_woothumbs_layout
		 *
		 * @param WC_Product $product WC_Product object.
		 * @param array      $args    Array of gallery arguments.
		 */
		do_action( 'iconic_woothumbs_layout', $product, $args );
		?>

	</div>

<?php
/**
 * Hook: iconic_woothumbs_after_all_images_wrap
 *
 * @param WC_Product $product WC_Product object.
 * @param array      $args    Array of gallery arguments.
 */
do_action( 'iconic_woothumbs_after_all_images_wrap', $product, $args );
