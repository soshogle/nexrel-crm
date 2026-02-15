<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Iconic_WooThumbs_Images.
 *
 * @class    Iconic_WooThumbs_Images
 * @version  1.0.0
 * @package  Iconic_WooThumbs
 * @category Class
 * @author   Iconic
 */
class Iconic_WooThumbs_Images {
	/**
	 * Run.
	 */
	public static function run() {
		add_action( 'after_setup_theme', array( __CLASS__, 'modify_theme_support' ), 11 );
		add_filter( 'woocommerce_gallery_image_size', array( __CLASS__, 'get_single_size_name' ), 10 );
		add_filter( 'woocommerce_logger_log_message', array( __CLASS__, 'after_regenerate_images' ), 10, 3 );
		add_filter( 'woocommerce_get_image_size_single', array( __CLASS__, 'get_image_size_single' ), 10 );
		add_filter( 'woocommerce_get_image_size_gallery_thumbnail', array( __CLASS__, 'get_image_size_gallery_thumbnail' ), 10 );
		add_filter( 'woocommerce_gallery_thumbnail_size', array( __CLASS__, 'gallery_thumbnail_size' ), 10 );
	}

	/**
	 * Change single width theme support.
	 */
	public static function modify_theme_support() {
		$theme_support = get_theme_support( 'woocommerce' );
		$theme_support = is_array( $theme_support ) ? $theme_support[0] : array();

		$theme_support['single_image_width'] = self::get_image_width( 'single' );

		remove_theme_support( 'woocommerce' );
		add_theme_support( 'woocommerce', $theme_support );
	}

	/**
	 * Get image width.
	 *
	 * @param string $size
	 *
	 * @return int
	 */
	public static function get_image_width( $size = 'single' ) {
		$woothumbs_settings = get_option( 'iconic_woothumbs_settings' );
		$setting_name       = sprintf( 'display_images_%s_image_width', $size );
		$default_width      = self::get_default_image_width( $size );
		$image_width        = ! empty( $woothumbs_settings[ $setting_name ] ) ? $woothumbs_settings[ $setting_name ] : $default_width;

		return absint( $image_width );
	}

	/**
	 * Get default image width.
	 *
	 * @param string $size
	 *
	 * @return int
	 */
	public static function get_default_image_width( $size = 'single' ) {
		switch ( $size ) {
			case 'single':
				return absint( wc_get_theme_support( 'single_image_width', get_option( 'woocommerce_single_image_width', 600 ) ) );
			case 'gallery_thumbnail':
				return absint( wc_get_theme_support( 'thumbnail_image_width', get_option( 'woocommerce_thumbnail_image_width', 300 ) ) );
		}
	}

	/**
	 * Get image crop.
	 *
	 * @param string $size
	 * @param bool   $dimension
	 *
	 * @return array|bool|mixed
	 */
	public static function get_image_crop( $size = 'single', $dimension = false ) {
		$woothumbs_settings = get_option( 'iconic_woothumbs_settings' );
		$setting_name       = sprintf( 'display_images_%s_image_crop_', $size );
		$default_cropping   = self::get_default_cropping( $size );

		if ( isset( $default_cropping[0] ) && ! is_numeric( $default_cropping[0] ) ) {
			$default_cropping[0] = 100;
			$default_cropping[1] = '';
		}

		$crop = array(
			'width'  => isset( $woothumbs_settings[ $setting_name . 'width' ] ) ? self::float_or_empty( $woothumbs_settings[ $setting_name . 'width' ] ) : $default_cropping[0],
			'height' => isset( $woothumbs_settings[ $setting_name . 'height' ] ) ? self::float_or_empty( $woothumbs_settings[ $setting_name . 'height' ] ) : $default_cropping[1],
		);

		if ( $dimension ) {
			return $crop[ $dimension ];
		}

		if ( empty( $crop['width'] ) || empty( $crop['height'] ) ) {
			return false;
		}

		return $crop;
	}

	/**
	 * Return float or empty value.
	 *
	 * @param $value
	 *
	 * @return float|string
	 */
	public static function float_or_empty( $value ) {
		if ( empty( $value ) ) {
			return '';
		}

		return floatval( $value );
	}

	/**
	 * Get default cropping.
	 *
	 * @param $size
	 *
	 * @return array
	 */
	public static function get_default_cropping( $size ) {
		switch ( $size ) {
			case 'gallery_thumbnail':
				$cropping = get_option( 'woocommerce_thumbnail_cropping', '1:1' );

				return explode( ':', $cropping );
			default:
				return array( '', '' );
		}
	}

	/**
	 * Get an attachment properties.
	 *
	 * @param int|string $attachment_id
	 *
	 * @return bool|array
	 */
	public static function get_attachment_props( $attachment_id, $product_id = null ) {
		$attachment_props = array(
			'title'              => null,
			'caption'            => null,
			'url'                => null,
			'alt'                => null,
			'src'                => null,
			'srcset'             => null,
			'sizes'              => null,
			'full_src'           => null,
			'full_src_w'         => null,
			'full_src_h'         => null,
			'thumb_src'          => null,
			'thumb_src_w'        => null,
			'thumb_src_h'        => null,
			'src_w'              => null,
			'src_h'              => null,
			'thumb_srcset'       => null,
			'thumb_sizes'        => null,
			'large_src'          => null,
			'large_src_w'        => null,
			'large_src_h'        => null,
			'large_srcset'       => null,
			'large_sizes'        => null,
			'aspect'             => null,
			'is_featured'        => null,
			'index'              => null,
			'image_lazy'         => null,
			'image_srcset'       => null,
			'image_sizes'        => null,
			'image_caption'      => null,
			'large_image_src'    => null,
			'large_image_width'  => null,
			'large_image_height' => null,
			'image_width'        => null,
			'image_height'       => null,
			'slide_aspect'       => null,
			'slide_index_class'  => null,
		);

		if ( 'placeholder' === $attachment_id ) {
			$placeholder                   = wc_placeholder_img_src();
			$attachment_props['src']       = $placeholder;
			$attachment_props['thumb_src'] = $placeholder;
			$attachment_props['large_src'] = $placeholder;

			return $attachment_props;
		}

		$product             = wc_get_product( $product_id );
		$wc_attachment_props = wc_get_product_attachment_props( $attachment_id );
		$attachment_props    = wp_parse_args( $wc_attachment_props, $attachment_props );
		$thumbnail_size_name = self::get_thumbnail_size_name();
		$single_size_name    = self::get_single_size_name();

		if ( version_compare( WC_VERSION, '3.3', '<' ) ) {
			// Large version.
			$src                            = wp_get_attachment_image_src( $attachment_id, 'full' );
			$attachment_props['full_src']   = $src[0];
			$attachment_props['full_src_w'] = $src[1];
			$attachment_props['full_src_h'] = $src[2];

			// Thumbnail version.
			$src                                         = wp_get_attachment_image_src( $attachment_id, $thumbnail_size_name );
			$attachment_props['gallery_thumbnail_src']   = $src[0];
			$attachment_props['gallery_thumbnail_src_w'] = $src[1];
			$attachment_props['gallery_thumbnail_src_h'] = $src[2];

			// Image source.
			$src                        = wp_get_attachment_image_src( $attachment_id, $single_size_name );
			$attachment_props['src']    = $src[0];
			$attachment_props['src_w']  = $src[1];
			$attachment_props['src_h']  = $src[2];
			$attachment_props['srcset'] = function_exists( 'wp_get_attachment_image_srcset' ) ? wp_get_attachment_image_srcset( $attachment_id, $single_size_name ) : false;
			$attachment_props['sizes']  = function_exists( 'wp_get_attachment_image_sizes' ) ? wp_get_attachment_image_sizes( $attachment_id, $single_size_name ) : false;
		}

		if ( empty( $attachment_props['src'] ) ) {
			return false;
		}

		global $iconic_woothumbs_class;

		$thumbnail_size_name = self::get_thumbnail_size_name();

		// Thumbnail retina.
		$attachment_props['gallery_thumbnail_srcset'] = wp_get_attachment_image_srcset( $attachment_id, $thumbnail_size_name );
		$attachment_props['gallery_thumbnail_sizes']  = wp_get_attachment_image_sizes( $attachment_id, $thumbnail_size_name );

		// Large version.
		$large_size                       = $iconic_woothumbs_class->settings['display_images_large_image_size'];
		$src                              = wp_get_attachment_image_src( $attachment_id, $large_size );
		$attachment_props['large_src']    = $src[0];
		$attachment_props['large_src_w']  = $src[1];
		$attachment_props['large_src_h']  = $src[2];
		$attachment_props['large_srcset'] = wp_get_attachment_image_srcset( $attachment_id, $large_size );
		$attachment_props['large_sizes']  = wp_get_attachment_image_sizes( $attachment_id, $large_size );

		// Assign product title to Alt if none is set.
		if ( empty( $attachment_props['alt'] ) && ! empty( $product_id ) ) {
			$attachment_props['alt'] = $product->get_title();
		}

		$caption = wp_get_attachment_caption( $attachment_id );

		if ( $caption ) {
			$attachment_props['caption'] = $caption;
		}

		if ( $attachment_id === $product->get_image_id() ) {
			$attachment_props['is_featured'] = true;
		}

		return $attachment_props;
	}


	/**
	 * Get image aspect ratio.
	 *
	 * @param int    $attachment_id Attachment ID.
	 * @param bool   $percentage    Whether to return a percentage value or not.
	 * @param string $size          Either `single` or `thumbnail`.
	 *
	 * @return str|int
	 */
	public static function get_image_aspect_ratio( $attachment_id, $percentage = false, $size = 'single' ) {
		global $iconic_woothumbs_class;

		$metadata     = wp_get_attachment_metadata( $attachment_id );
		$image_size   = 'woocommerce_' . $size;
		$width        = ( ! empty( $metadata['sizes'][ $image_size ]['width'] ) ) ? $metadata['sizes'][ $image_size ]['width'] : $metadata['width'];
		$height       = ( ! empty( $metadata['sizes'][ $image_size ]['height'] ) ) ? $metadata['sizes'][ $image_size ]['height'] : $metadata['height'];
		$aspect_ratio = false;

		if ( $width && $height ) {
			if ( $width >= $height ) {
				$aspect_ratio = number_format( ( $width / $height ), 2 ) . ':1';
			} else {
				$aspect_ratio = '1:' . number_format( ( $height / $width ), 2 );
			}
		}

		$global_aspect_ratio          = Iconic_WooThumbs_Helpers::get_global_aspect_ratio( $size );
		$image_size_width_setting     = $iconic_woothumbs_class->settings[ 'display_images_' . $size . '_image_width' ];
		$override_global_aspect_ratio = ( $width && $image_size_width_setting && $width < $image_size_width_setting );
		$aspect_ratio                 = ( $global_aspect_ratio && ! $override_global_aspect_ratio ) ? $global_aspect_ratio : $aspect_ratio;

		/**
		 * Modify attachment aspect ratio.
		 *
		 * @since 4.12.0
		 *
		 * @param string $aspect_ratio Aspect ratio of the attachment.
		 * @param int    $attachment   Attachment ID.
		 * @param bool   $percentage   True to return a percentage, false to return an aspect ratio string e.g 16:9.
		 */
		$aspect_ratio = apply_filters( 'iconic_woothumbs_aspect_ratio', $aspect_ratio, $attachment_id, $percentage );

		if ( ! $percentage ) {
			return $aspect_ratio;
		}

		$aspect_ratio_parts = explode( ':', $aspect_ratio );

		return ( $aspect_ratio_parts[1] / $aspect_ratio_parts[0] ) * 100;
	}

	/**
	 * Get thumbnail size name.
	 *
	 * @return string
	 */
	public static function get_thumbnail_size_name() {
		if ( version_compare( WC_VERSION, '3.3', '<' ) ) {
			return 'shop_thumbnail';
		} else {
			return 'woocommerce_gallery_thumbnail';
		}
	}

	/**
	 * Get thumbnail size name.
	 *
	 * @return string
	 */
	public static function get_single_size_name() {
		if ( version_compare( WC_VERSION, '3.3', '<' ) ) {
			return 'shop_single';
		} else {
			return 'woocommerce_single';
		}
	}

	/**
	 * After regenerate images.
	 *
	 * @param $message
	 * @param $level
	 * @param $context
	 *
	 * @return mixed
	 */
	public static function after_regenerate_images( $message, $level, $context ) {
		if ( empty( $context['source'] ) ) {
			return $message;
		}

		if ( $context['source'] !== 'wc-image-regeneration' ) {
			return $message;
		}

		if ( strpos( $message, 'Completed' ) === false ) {
			return $message;
		}

		global $iconic_woothumbs_class;

		$iconic_woothumbs_class->cache_class()::delete_cache_entries( true );

		return $message;
	}

	/**
	 * Get image size data.
	 *
	 * @param string $size
	 *
	 * @return array
	 */
	public static function get_image_size_data( $size ) {
		static $sizes;

		if ( ! empty( $sizes[ $size ] ) ) {
			return $sizes[ $size ];
		}

		$sizes[ $size ] = array();
		$crop           = self::get_image_crop( $size );

		$sizes[ $size ]['width']  = absint( self::get_image_width( $size ) );
		$sizes[ $size ]['height'] = absint( $crop ? self::get_image_height_from_crop( $sizes[ $size ]['width'], $crop ) : '' );
		$sizes[ $size ]['crop']   = $crop ? 1 : 0;

		return $sizes[ $size ];
	}

	/**
	 * Modify single image size.
	 *
	 * @param array $size_data
	 *
	 * @return array
	 */
	public static function get_image_size_single( $size_data ) {
		if ( version_compare( WC_VERSION, '3.3', '<' ) ) {
			return $size_data;
		}

		return self::get_image_size_data( 'single' );
	}

	/**
	 * Modify gallery thumbnail image size.
	 *
	 * @param array $size_data
	 *
	 * @return array
	 */
	public static function get_image_size_gallery_thumbnail( $size_data ) {
		if ( version_compare( WC_VERSION, '3.3', '<' ) ) {
			return $size_data;
		}

		return self::get_image_size_data( 'gallery_thumbnail' );
	}

	/**
	 * Get image height from width/crop settings.
	 *
	 * @param float $width
	 * @param array $crop
	 *
	 * @return float
	 */
	public static function get_image_height_from_crop( $width, $crop ) {
		if ( empty( $width ) || empty( $crop['width'] ) || empty( $crop['height'] ) ) {
			return false;
		}

		return $width / ( ( $width * $crop['width'] ) / ( $width * $crop['height'] ) );
	}

	/**
	 * Ensure empty values are 0.
	 *
	 * Fixes an issue where WP expects a numeric value, but Woo could pass
	 * and empty string.
	 *
	 * @param array $size
	 *
	 * @return array|int
	 */
	public static function gallery_thumbnail_size( $size ) {
		if ( is_array( $size ) ) {
			return array_map( 'absint', $size );
		}

		if ( empty( $size ) ) {
			return 0;
		}

		return $size;
	}

	/**
	 * Dedupe images?
	 *
	 * @return bool
	 */
	public static function get_dedupe_images() {
		/**
		 * Filter: iconic_woothumbs_dedupe_gallery_images
		 *
		 * @param $filter True to remove duplicates, false to keep them.
		 */
		return apply_filters( 'iconic_woothumbs_dedupe_gallery_images', true );
	}
}
