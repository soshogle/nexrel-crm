<?php
/**
 * Block.
 *
 * @package iconic-woothumbs
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Iconic_WooThumbs_Block.
 *
 * @since 5.0.0
 */
class Iconic_WooThumbs_Block {
	/**
	 * Run.
	 */
	public static function run() {
		add_filter( 'rest_product_query', array( __CLASS__, 'filter_rest_product_query' ), 10, 2 );
		add_action( 'init', array( __CLASS__, 'block_init' ) );
		add_action( 'rest_api_init', array( __CLASS__, 'add_gallery_images_to_rest_query' ) );
		add_filter( 'render_block', array( __CLASS__, 'override_default_wc_product_gallery_block_render' ), 20, 2 );
	}

	/**
	 * Filter the REST API query arguments for queries
	 * relating to the `product` CPT.
	 *
	 * @param array           $args    Key value array of query var to query value.
	 * @param WP_REST_Request $request The request used.
	 */
	public static function filter_rest_product_query( $args, $request ) {
		if ( $request->get_param( 'woothumbs' ) ) {
			$meta_key = 'disable_woothumbs';
			// We cannot just look for the existence of a `no` value,
			// we have to look for products where the meta has not been
			// saved yet.
			//
			// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
			$args['meta_query'] = array(
				'relation' => 'OR',
				array(
					'key'     => $meta_key,
					'compare' => 'NOT EXISTS',
				),
				array(
					'key'     => $meta_key,
					'value'   => 'yes',
					'compare' => '!=',
				),
			);
		}
		return $args;
	}

	/**
	 * Initialize the block using dynamic rendering.
	 */
	public static function block_init() {
		global $iconic_woothumbs_class;

		if ( ! is_object( $iconic_woothumbs_class ) ) {
			return;
		}

		register_block_type(
			// This is the path to where the block.json file exists.
			$iconic_woothumbs_class->plugin_path . 'assets/block/build',
			array(
				'render_callback' => array( __CLASS__, 'block_render' ),
			)
		);
	}

	/**
	 * Render the block dynamically.
	 *
	 * @param array $attributes Block attributes.
	 */
	public static function block_render( $attributes ) {
		global $product;

		$product_id = false;

		if ( ! empty( $attributes['selectedProduct'] ) ) {
			$selected_product = json_decode( $attributes['selectedProduct'], true );

			if ( $selected_product && ! empty( $selected_product['value'] ) ) {
				$product_id = preg_replace( '/[^0-9]/', '', $selected_product['value'] );
			} else {
				return;
			}
		} elseif ( $product && is_a( $product, 'WC_Product' ) ) {
			$product_id = $product->get_ID();
		} else {
			return;
		}

		if ( ! $product_id ) {
			return;
		}

		$gallery_align = ( ! empty( $attributes['align'] ) ) ? $attributes['align'] : 'default';
		$gallery_width = ( ! empty( $attributes['galleryWidth'] ) && 100 !== $attributes['galleryWidth'] ) ? $attributes['galleryWidth'] : '';

		ob_start();

		echo do_shortcode(
			sprintf(
				'[woothumbs-gallery id="%s" gallery_align="%s" gallery_width="%s"]',
				esc_attr( $product_id ),
				esc_attr( $gallery_align ),
				esc_attr( $gallery_width )
			)
		);

		return ob_get_clean();
	}

	/**
	 * Modify the product REST query to return the gallery images.
	 *
	 * @return void
	 */
	public static function add_gallery_images_to_rest_query() {
		register_rest_field(
			'product',
			'gallery_images',
			array(
				'get_callback' => function( $product_arr ) {
					$product = wc_get_product( $product_arr['id'] );
					return ( $product ) ? (array) $product->get_gallery_image_ids() : array();
				},
				'schema'       => array(
					'description' => esc_html__( 'Gallery images.' ),
					'type'        => 'array',
				),
			)
		);
	}

	/**
	 * Overide the default WC product gallery block render,
	 * and replace the output with WooThumbs.
	 *
	 * @param string $block_content Block HTML as a string.
	 * @param array  $block         Associative array of block parameters.
	 * 
	 * @return void
	 */
	public static function override_default_wc_product_gallery_block_render( $block_content, $block ) {
		global $iconic_woothumbs_class;

		/**
		 * Filter: modify the list of blocks WooThumbs
		 * will override when rendering on the front-end.
		 * 
		 * @since 5.6.0
		 * @filter: iconic_woothumbs_override_blocks
		 * @param string[] $blocks Blocks to override.
		 */
		$blocks_to_override = apply_filters( 
			'iconic_woothumbs_override_blocks', 
			array(
				'woocommerce/product-image-gallery',
				'woocommerce/product-image'
			)
		);

		if ( empty( $block['blockName'] ) || ! in_array( $block['blockName'], $blocks_to_override, true ) ) {
			return $block_content;
		}

		// We only want to replace the single product image block
		// if we're in the single product block. Otherwise, we could
		// be interfering with legitimate uses of a single product
		// image as part of a more customised product page or post.
		if ( 
			'woocommerce/product-image' === $block['blockName'] &&
			empty( $block['attrs']['isDescendentOfSingleProductBlock'] )
		) {
			return $block_content;
		}
		
		ob_start();
		
		$iconic_woothumbs_class->show_product_images(
			array(
				'gallery_width' => 100,
				'gallery_align' => 'default',
			)
		);

		return ob_get_clean();
	}
}
