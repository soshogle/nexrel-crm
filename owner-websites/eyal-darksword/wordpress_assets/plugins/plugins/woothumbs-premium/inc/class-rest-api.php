<?php
/**
 * REST API.
 *
 * @package iconic-woothumbs
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Iconic_WooThumbs_REST_API.
 */
class Iconic_WooThumbs_REST_API {
	/**
	 * Media meta key.
	 *
	 * @var string
	 */
	private static $media_meta_key = '_iconic_woothumbs_media';

	/**
	 * Media aspect ratio meta key.
	 *
	 * @var string
	 */
	private static $media_aspect_ratio_meta_key = '_iconic_woothumbs_media_aspect_ratio';

	/**
	 * Run
	 */
	public static function run() {
		add_action( 'init', array( __CLASS__, 'register_media_meta_fields' ) );
		add_action( 'rest_api_init', array( __CLASS__, 'add_iconic_media_meta_to_rest_api' ) );
	}

	/**
	 * Register the meta fields with the REST API.
	 */
	public static function register_media_meta_fields() {
		$args = array(
			'show_in_rest' => true,
			'single'       => true,
			'type'         => 'string',
		);

		register_meta(
			'attachment',
			self::$media_meta_key,
			$args
		);

		register_meta(
			'attachment',
			self::$media_aspect_ratio_meta_key,
			$args
		);
	}

	/**
	 * Add meta fields to the REST API.
	 */
	public static function add_iconic_media_meta_to_rest_api() {
		$args = array(
			'get_callback'    => array( __CLASS__, 'get_media_meta' ),
			'update_callback' => array( __CLASS__, 'update_media_meta' ),
			'schema'          => array(
				'type'              => 'string',
				'validate_callback' => function( $param ) { return is_string( $param ); },
				'sanitize_callback' => 'sanitize_text_field'
			),
		);

		register_rest_field(
			'attachment', 
			self::$media_meta_key,
			$args
		);

		register_rest_field(
			'attachment', 
			self::$media_aspect_ratio_meta_key,
			$args
		);
	}

	/**
	 * Get the media meta field value.
	 */
	public static function get_media_meta( $object, $field_name, $request ) {
		return get_post_meta( $object['id'], $field_name, true );
	}

	/**
	 * Update the media meta field value.
	 */
	public static function update_media_meta( $value, $object, $field_name ) {
		return update_post_meta( $object->ID, $field_name, $value );
	}
}
