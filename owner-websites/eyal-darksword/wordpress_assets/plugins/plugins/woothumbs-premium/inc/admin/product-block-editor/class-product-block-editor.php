<?php
/**
 * Integrate with WooCommerce Product Block editor.
 *
 * @see https://github.com/woocommerce/woocommerce/tree/trunk/docs/product-editor-development
 * @package iconic
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use Automattic\WooCommerce\Utilities\FeaturesUtil;
use Automattic\WooCommerce\Admin\Features\ProductBlockEditor\BlockRegistry;

/**
 * Iconic_WooThumbs_Product_Block_Editor class.
 *
 * @since 5.12.0
 */
class Iconic_WooThumbs_Product_Block_Editor {
	/**
	 * Run.
	 */
	public static function run() {
		add_action( 'init', array( __CLASS__, 'register_blocks' ) );

		self::add_woothumbs_group();
		self::handle_woothumbs_group_fields();

		// Attribute images
		add_action( 'woocommerce_block_template_area_product-form_after_add_block_variations', [ __CLASS__, 'add_attribute_images_fields' ] );
		add_action( 'woocommerce_rest_insert_product_object', [ __CLASS__, 'save_woothumbs_attribute_images_data' ], 10, 2 );
		add_filter( 'woocommerce_rest_prepare_product_object', array( __CLASS__, 'add_attribute_images_data_to_rest_response' ), 10, 3 );

		// Variation images
		add_action( 'woocommerce_block_template_area_product-form_after_add_block_general', [ __CLASS__, 'add_variation_images_fields' ] );
		add_action( 'woocommerce_rest_insert_product_variation_object', [ __CLASS__, 'save_woothumbs_variations_images_data' ], 10, 2 );
		add_filter( 'woocommerce_rest_prepare_product_variation_object', array( __CLASS__, 'add_variation_images_data_to_rest_response' ), 10, 3 );
	}

	/**
	 * Register the WooThumbs block.
	 *
	 * This function mimics the way WooCommerce registers its blocks to the Product Block Editor.
	 *
	 * @return void
	 */
	public static function register_blocks() {
		if ( isset( $_GET['page'] ) && $_GET['page'] === 'wc-admin' ) { // phpcs:ignore WordPress.Security.NonceVerification
			BlockRegistry::get_instance()->register_block_type_from_metadata( ICONIC_WOOTHUMBS_INC_PATH . '/admin/product-block-editor/blocks/attribute-images/build' );
			BlockRegistry::get_instance()->register_block_type_from_metadata( ICONIC_WOOTHUMBS_INC_PATH . '/admin/product-block-editor/blocks/variation-images/build' );
		}
	}

	/**
	 * Add WooThumbs group and its fields.
	 *
	 * @return void
	 */
	protected static function add_woothumbs_group() {
		add_action(
			'woocommerce_block_template_area_product-form_after_add_block_linked-products',
			function( $linked_products_group ) {
				$parent = $linked_products_group->get_parent();

				$group = $parent->add_group(
					[
						'id'         => 'iconic-woothumbs-group',
						'order'      => $linked_products_group->get_order() + 5,
						'attributes' => [
							'title' => __( 'WooThumbs', 'iconic-woothumbs' ),
						],
					]
				);

				$group->add_block(
					array(
						'id'         => 'iconic-woothumbs-notice',
						'blockName'  => 'woocommerce/product-has-variations-notice',
						'order'      => 3,
						'attributes' => array(
							'content'    => __( 'WooThumbs Variation and Attribute images can be managed in the Variations tab.', 'iconic-woothumbs' ),
							'buttonText' => __( 'Go to Variations', 'iconic-woothumbs' ),
						),
					)
				);

				$section = $group->add_section(
					[
						'id'    => 'iconic-woothumbs-section',
						'order' => 5,
					]
				);

				$section->add_block(
					[
						'id'         => 'iconic-woothumbs-disable-field',
						'order'      => 5,
						'blockName'  => 'woocommerce/product-checkbox-field',
						'attributes' => [
							'property'     => 'meta_data.disable_woothumbs',
							'label'        => __( 'Disable WooThumbs?', 'iconic-woothumbs' ),
							'checkedValue' => 'yes',
						],
					]
				);

				$section->add_block(
					[
						'id'         => 'iconic-woothumbs-video-url-field',
						'order'      => 10,
						'blockName'  => 'woocommerce/product-text-field',
						'attributes' => [
							'property' => 'iconic-woothumbs-video-url-value',
							'label'    => __( 'Video URL', 'iconic-woothumbs' ),
							'help'     => __( 'Enter a video URL to display in the lightbox only ( a video play icon will be placed over the gallery images ). Most video hosting services are supported.', 'iconic-woothumbs' ),
						],
					]
				);
			}
		);
	}

	/**
	 * Handle WooThumbs group fields.
	 *
	 * @return void
	 */
	protected static function handle_woothumbs_group_fields() {
		add_action( 'woocommerce_rest_insert_product_object', [ __CLASS__, 'save_woothumbs_group_fields' ], 10, 2 );
		add_filter( 'woocommerce_rest_prepare_product_object', [ __CLASS__, 'add_woothumbs_group_data_to_rest_response' ], 10, 3 );
	}

	/**
	 * Save WooThumbs group fields.
	 *
	 * @param WC_Product      $product The product object saved.
	 * @param WP_REST_Request $request The HTTP request.
	 * @return void
	 */
	public static function save_woothumbs_attribute_images_data( WC_Product $product, WP_REST_Request $request ) {
		if ( ! FeaturesUtil::feature_is_enabled( 'product_block_editor' ) ) {
			return;
		}

		$attribute_images = $request->get_param( 'iconic_woothumbs_attribute_images' );

		if ( is_null( $attribute_images ) ) {
			return;
		}

		update_post_meta( $product->get_id(), '_iconic_woothumbs_ai', $attribute_images['data'] ?? [] );
	}

	/**
	 * Save WooThumbs Variation Images fields.
	 *
	 * @param WC_Product_Variation $variation The product variation object saved.
	 * @param WP_REST_Request      $request The HTTP request.
	 * @return void
	 */
	public static function save_woothumbs_variations_images_data( WC_Product_Variation $variation, WP_REST_Request $request ) {
		if ( ! FeaturesUtil::feature_is_enabled( 'product_block_editor' ) ) {
			return;
		}

		$variation_images = $request->get_param( 'iconic_woothumbs_variation_images' );

		if ( is_null( $variation_images ) ) {
			return;
		}

		if ( ! is_array( $variation_images ) ) {
			return;
		}

		$variation_images = join( ',', wp_list_pluck( $variation_images, 'id' ) );

		update_post_meta( $variation->get_id(), '_product_image_gallery', $variation_images );
	}

	/**
	 * Save WooThumbs group fields.
	 *
	 * @param WC_Product      $product The product object saved.
	 * @param WP_REST_Request $request The HTTP request.
	 * @return void
	 */
	public static function save_woothumbs_group_fields( WC_Product $product, WP_REST_Request $request ) {
		if ( ! FeaturesUtil::feature_is_enabled( 'product_block_editor' ) ) {
			return;
		}

		$video_url_value = $request->get_param( 'iconic-woothumbs-video-url-value' );

		if ( is_null( $video_url_value ) ) {
			return;
		}

		$product_settings = [
			'video_url' => sanitize_text_field( (string) $video_url_value ),
		];

		update_post_meta( $product->get_id(), '_iconic_woothumbs', $product_settings );
	}

	/**
	 * Add WooThumbs data to the Product Block editor REST response.
	 *
	 * @param WP_REST_Response $response The Product Block editor REST response.
	 * @param WC_Product       $product  The edited product.
	 * @param WP_REST_Request  $request  The request to retrieve the product object.
	 * @return WP_REST_Response
	 */
	public static function add_woothumbs_group_data_to_rest_response( WP_REST_Response $response, WC_Product $product, WP_REST_Request $request ) {
		if ( ! FeaturesUtil::feature_is_enabled( 'product_block_editor' ) ) {
			return $response;
		}

		if ( 'edit' !== $request->get_param( 'context' ) ) {
			return $response;
		}

		if ( $product->get_id() !== $request->get_param( 'id' ) ) {
			return $response;
		}

		$video_url = Iconic_WooThumbs_Product::get_setting( $product->get_id(), 'video_url' );

		$response->data['iconic-woothumbs-video-url-value'] = is_string( $video_url ) ? trim( $video_url ) : '';

		return $response;
	}

	/**
	 * Add Attribute Images fields to the Product Block editor.
	 *
	 * The fields are added within Variations group.
	 *
	 * @param BlockInterface $variations_group The variations group.
	 * @return void
	 */
	public static function add_attribute_images_fields( $variations_group ) {
		$section = $variations_group->add_section(
			[
				'id'         => 'iconic-woothumbs-attribute-images-section',
				'order'      => 15,
				'attributes' => [
					'title'       => __( 'Attribute Images', 'iconic-woothumbs' ),
					'description' => __( 'By WooThumbs', 'iconic-woothumbs' ),
				],
			]
		);

		$section->add_block(
			[
				'id'         => 'iconic-woothumbs-attribute-images-fields',
				'blockName'  => 'iconic-woothumbs/attribute-images',
				'order'      => 10,
				'attributes' => [
					'property' => 'iconic_woothumbs_attribute_images',
				],
			]
		);
	}

	/**
	 * Add Variation Images fields to the Product Block editor.
	 *
	 * The fields are added within General group.
	 *
	 * @param BlockInterface $general_group The General group.
	 * @return void
	 */
	public static function add_variation_images_fields( $general_group ) {
		$section = $general_group->add_section(
			[
				'id'             => 'iconic-woothumbs-variation-images-section',
				'order'          => 35,
				'attributes'     => [
					'title'       => __( 'Variation Images', 'iconic-woothumbs' ),
					'description' => __( 'By WooThumbs', 'iconic-woothumbs' ),
				],
				'hideConditions' => [
					[
						'expression' => '!editedProduct.parent_id',
					],
				],
			]
		);

		$section->add_block(
			[
				'id'         => 'iconic-woothumbs-variation-images-fields',
				'blockName'  => 'iconic-woothumbs/variation-images',
				'order'      => 10,
				'attributes' => [
					'property' => 'iconic_woothumbs_variation_images',
				],
			]
		);
	}

	/**
	 * Add Attribute Images data to the Product Block editor REST response.
	 *
	 * @param WP_REST_Response $response The Product Block editor REST response.
	 * @param WC_Product       $product  The edited product.
	 * @param WP_REST_Request  $request  The request to retrieve the product object.
	 * @return WP_REST_Response
	 */
	public static function add_attribute_images_data_to_rest_response( WP_REST_Response $response, WC_Product $product, WP_REST_Request $request ) {
		if ( ! FeaturesUtil::feature_is_enabled( 'product_block_editor' ) ) {
			return $response;
		}

		if ( 'edit' !== $request->get_param( 'context' ) ) {
			return $response;
		}

		if ( ! $product->is_type( 'variable' ) ) {
			$response->data['iconic_woothumbs_attribute_images'] = [
				'data'              => [],
				'productAttributes' => [],
			];

			return $response;
		}

		$ai_data = get_post_meta( $product->get_id(), '_iconic_woothumbs_ai', true );
		$ai_data = is_array( $ai_data ) ? $ai_data : [];

		foreach ( $ai_data as $key => $value ) {
			if ( 'all' !== $key ) {
				continue;
			}

			$ai_data[ $key ]['label'] = __( 'All Attributes', 'iconic-woothumbs' );
		}

		$product_attributes = array_map(
			function( WC_Product_Attribute $attribute ) use ( $product ) {
				$value = $attribute->get_name();
				$name  = wc_attribute_label( $value );

				$label = sprintf(
					'%s %s %s',
					esc_html__( 'Add', 'iconic-woothumbs' ),
					$name,
					esc_html__( 'images', 'iconic-woothumbs' )
				);

				$terms = wc_get_product_terms(
					$product->get_id(),
					$attribute->get_name(),
					array(
						'fields' => 'id=>name',
					)
				);

				return [
					'value'      => $value,
					'label'      => $label,
					'data-label' => $name,
					'terms'      => $terms,
				];
			},
			$product->get_attributes( 'edit' )
		);

		$data = [
			'data'              => $ai_data,
			'productAttributes' => $product_attributes,
		];

		$response->data['iconic_woothumbs_attribute_images'] = $data;

		return $response;
	}

	/**
	 * Add Variation Images data to the Product Block editor REST response.
	 *
	 * @param WP_REST_Response $response  The Product Block editor REST response.
	 * @param WC_Product       $variation The edited product variation.
	 * @param WP_REST_Request  $request   The request to retrieve the product object.
	 * @return WP_REST_Response
	 */
	public static function add_variation_images_data_to_rest_response( WP_REST_Response $response, WC_Product $variation, WP_REST_Request $request ) {
		if ( ! FeaturesUtil::feature_is_enabled( 'product_block_editor' ) ) {
			return $response;
		}

		if ( 'edit' !== $request->get_param( 'context' ) ) {
			return $response;
		}

		$variation_images = get_post_meta( $variation->get_id(), '_product_image_gallery', true );

		if ( ! is_string( $variation_images ) ) {
			$response->data['iconic_woothumbs_variation_images'] = [];

			return $response;
		}

		$variation_images = array_filter(
			array_map(
				function( $image_id ) {
					if ( ! is_numeric( $image_id ) ) {
						return false;
					}

					$url = wp_get_attachment_image_url( $image_id );

					if ( ! $url ) {
						return false;
					}

					return [
						'id'  => (int) $image_id,
						'url' => $url,
					];
				},
				explode( ',', $variation_images )
			)
		);

		$response->data['iconic_woothumbs_variation_images'] = $variation_images;

		return $response;
	}
}
