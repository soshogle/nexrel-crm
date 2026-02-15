<?php
/**
 * Media.
 *
 * @package iconic-woothumbs
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Iconic_WooThumbs_Media.
 *
 * @class    Iconic_WooThumbs_Media
 * @version  1.0.0
 * @package  Iconic_WooThumbs.
 */
class Iconic_WooThumbs_Media {
	/**
	 * Media meta key.
	 *
	 * @var string
	 */
	private static $media_meta_key = 'iconic_woothumbs_media';

	/**
	 * Media aspect ratio meta key.
	 *
	 * @var string
	 */
	private static $media_aspect_ratio_meta_key = 'iconic_woothumbs_media_aspect_ratio';

	/**
	 * Run
	 */
	public static function run() {
		add_action( 'iconic_woothumbs_before_thumbnail', array( __CLASS__, 'thumbnail_play_icon' ), 10, 2 );

		add_filter( 'attachment_fields_to_edit', array( __CLASS__, 'attachment_fields_to_edit' ), 10, 2 );
		add_filter( 'attachment_fields_to_save', array( __CLASS__, 'attachment_fields_to_save' ), 10, 2 );
		add_filter( 'iconic_woothumbs_embed_html', array( __CLASS__, 'filter_embed_html' ), 10, 3 );
		add_filter( 'iconic_woothumbs_single_image_data', array( __CLASS__, 'single_image_data' ), 10, 2 );
	}

	/**
	 * Add fields to the $form_fields array
	 *
	 * @param array  $form_fields Form fields.
	 * @param object $post        WP_Post instance.
	 *
	 * @return array
	 */
	public static function attachment_fields_to_edit( $form_fields, $post ) {
		if ( strpos( $post->post_mime_type, 'image/' ) !== 0 ) {
			return $form_fields;
		}

		$form_fields['iconic_woothumbs_media_title'] = array(
			'tr' => '<td colspan="2" id="iconic-woothumbs-attach-mp4-header-cell" >' . sprintf( '<h2>%s</h2>', __( 'WooThumbs Media Details', 'iconic-woothumbs' ) ) . '</td>',
		);

		$form_fields[ self::$media_meta_key ] = array(
			'label' => __( 'Media URL', 'iconic-woothumbs' ),
			'input' => 'text',
			'value' => get_post_meta( $post->ID, '_' . self::$media_meta_key, true ),
		);

		/* Translators: %s: Link to wordpress.org article */
		$valid_media_link = sprintf( __( 'Enter a <a href="%s" target="_blank">valid media URL</a>, or click "Attach MP4/WEBM" to upload your own video into the WordPress media library.', 'iconic-woothumbs' ), esc_url( 'https://wordpress.org/support/article/embeds/#okay-so-what-sites-can-i-embed-from' ) );

		$form_fields['iconic_woothumbs_media_upload'] = array(
			'tr' => '<th scope="row" class="label">&nbsp;</th>
			<td class="field iconic-woothumbs-attach-btn-cell">
			<span class="setting has-description"><a href="#" class="iconic-wt-upload-media button-secondary" data-image-id="' . esc_attr( $post->ID ) . '">' . __( 'Attach MP4/WEBM', 'iconic-woothumbs' ) . '</a></span>
			<p class="description" style="width: 100%; padding-top: 4px;">' . $valid_media_link . '</p>
			</td>',
		);

		$form_fields[ self::$media_aspect_ratio_meta_key ] = array(
			'label' => __( 'Aspect Ratio', 'iconic-woothumbs' ),
			'input' => 'text',
			'value' => self::get_media_aspect_ratio( $post->ID ),
		);

		$form_fields['iconic_woothumbs_media_description'] = array(
			'tr' => '<td colspan="2" style="display: block; padding-top: 8px;">
			    <p class="description">' . sprintf( '<strong>%s</strong>: %s', __( 'Note', 'iconic-woothumbs' ), __( 'Any changes made to the WooThumbs media settings are saved automatically.', 'iconic-woothumbs' ) ) . '</p>
			</td>',
		);

		return $form_fields;
	}

	/**
	 * Get media aspect ratio.
	 *
	 * @param int|string $attachment Attachment ID or attachment media URL string.
	 * @param bool       $percentage Whether to return a percentage value or not.
	 *
	 * @return str|int
	 */
	public static function get_media_aspect_ratio( $attachment, $percentage = false ) {
		$aspect_ratio = $attachment && is_numeric( $attachment ) ? get_post_meta( $attachment, '_' . self::$media_aspect_ratio_meta_key, true ) : false;

		if ( ! $aspect_ratio && ( is_string( $attachment ) || ! $attachment ) ) {
			$attachment = attachment_url_to_postid( $attachment );

			if ( $attachment ) {
				$metadata     = wp_get_attachment_metadata( $attachment );
				$width        = ( ! empty( $metadata['width'] ) ) ? $metadata['width'] : false;
				$height       = ( ! empty( $metadata['height'] ) ) ? $metadata['height'] : false;
				$aspect_ratio = false;

				if ( $width && $height ) {
					if ( $width >= $height ) {
						$aspect_ratio = round( ( $width / $height ), 2 ) . ':1';
					} else {
						$aspect_ratio = '1:' . round( ( $height / $width ), 2 );
					}
				}
			}
		}

		$aspect_ratio = ( $aspect_ratio ) ? $aspect_ratio : Iconic_WooThumbs_Helpers::get_global_aspect_ratio();

		// If something is wrong with the user added, calculated, or global
		// aspect ratio, we need *some* default value to return here.
		if ( ! $aspect_ratio ) {
			$aspect_ratio = '16:9';
		}

		/**
		 * Modify attachment aspect ratio.
		 *
		 * @since 4.12.0
		 *
		 * @param string $aspect_ratio Aspect ratio of the attachment.
		 * @param int    $attachment   Attachment ID.
		 * @param bool   $percentage   True to return a percentage, false to return an aspect ratio string e.g 16:9.
		 */
		$aspect_ratio = apply_filters( 'iconic_woothumbs_aspect_ratio', $aspect_ratio, $attachment, $percentage );

		if ( ! $percentage ) {
			// Enforce a sensible ratio when cropping settings
			// are configured to favour portrait images.
			if ( '100:0' === $aspect_ratio ) {
				$aspect_ratio = '2:3';
			}

			return $aspect_ratio;
		}

		$aspect_ratio_parts = explode( ':', $aspect_ratio );

		return ( $aspect_ratio_parts[1] / $aspect_ratio_parts[0] ) * 100;
	}

	/**
	 * Get the aspect ratio for the global product media.
	 *
	 * @return string
	 */
	public static function get_global_media_aspect_ratio() {
		$global_aspect_ratio       = Iconic_WooThumbs_Helpers::get_global_aspect_ratio();
		$global_aspect_ratio_parts = explode( ':', $global_aspect_ratio );

		// We never want to return a square video, so either take the portrait orientation
		// aspect ratio, or return 16:9 which is standard on YouTube/Vimeo.
		if ( count( $global_aspect_ratio_parts ) === 2 && $global_aspect_ratio_parts[0] < $global_aspect_ratio_parts[1] ) {
			$aspect_ratio = $global_aspect_ratio;
		} else {
			$aspect_ratio = '16:9';
		}

		/**
		 * Modify global media aspect ratio.
		 *
		 * @since 5.2.0
		 *
		 * @param string $global_aspect_ratio Global aspect ratio.
		 */
		$aspect_ratio = apply_filters( 'iconic_woothumbs_global_media_aspect_ratio', $global_aspect_ratio );

		return $aspect_ratio;
	}

	/**
	 * Save attachment fields
	 *
	 * @param array $post       WP_Post data.
	 * @param array $attachment Attachment data.
	 *
	 * @return array
	 */
	public static function attachment_fields_to_save( $post, $attachment ) {
		global $iconic_woothumbs_class;

		if ( isset( $attachment[ self::$media_meta_key ] ) ) {
			update_post_meta( $post['ID'], '_' . self::$media_meta_key, $attachment[ self::$media_meta_key ] );
		}

		if ( isset( $attachment[ self::$media_aspect_ratio_meta_key ] ) ) {
			update_post_meta( $post['ID'], '_' . self::$media_aspect_ratio_meta_key, $attachment[ self::$media_aspect_ratio_meta_key ] );
		}

		if ( ! empty( $post['post_parent'] ) ) {
			$iconic_woothumbs_class->cache_class()::delete_cache_entries( true, $post['post_parent'] );
		}

		return $post;
	}

	/**
	 * Embed markup.
	 *
	 * @param string|false $embed         Embed as a string.
	 * @param string       $url           URL to fetch.
	 * @param int          $attachment_id Attachment ID.
	 */
	public static function filter_embed_html( $embed, $url, $attachment_id ) {
		if ( strpos( $url, 'youtube' ) !== false || strpos( $url, 'youtu.be' ) !== false ) {
			$embed = self::modify_embed_html(
				$embed,
				'youtube',
				$url,
				array(
					'showinfo'        => 0,
					'rel'             => 0,
					'iv_load_policy'  => 3,
					'modestbranding'  => 1,
					'playsinline'     => 1,
					'origin'          => home_url(),
					'widget_referrer' => home_url(),
				)
			);
		} elseif ( strpos( $url, 'vimeo' ) !== false ) {
			$embed = self::modify_embed_html(
				$embed,
				'vimeo',
				$url,
				array(
					'byline'   => 0,
					'title'    => 0,
					'portrait' => 0,
				)
			);
		}

		return $embed;
	}

	/**
	 * Modify embed src.
	 *
	 * @param string $html     HTML string.
	 * @param string $provider Provider, either `youtube` or `vimeo`.
	 * @param string $url      Requested URL.
	 * @param array  $args     Arguments.
	 */
	public static function modify_embed_html( $html, $provider, $url, $args ) {
		$html = str_replace( '%plyr_provider%', $provider, $html );
		$html = str_replace( '%plyr_options%', htmlspecialchars( wp_json_encode( $args ), ENT_QUOTES, 'UTF-8' ), $html );

		return $html;
	}

	/**
	 * Get media URL.
	 *
	 * @param int $attachment_id Attachment ID.
	 *
	 * @return bool|str
	 */
	public static function get_media_url( $attachment_id ) {
		return get_post_meta( $attachment_id, '_' . self::$media_meta_key, true );
	}

	/**
	 * Get media embed.
	 *
	 * @param int|string $attachment       Attachment ID or media URL.
	 * @param int|bool   $post_id          WordPress post ID or boolean false.
	 * @param bool       $is_product_video Whether this is the global product video.
	 *
	 * @return bool|str
	 */
	public static function get_media_embed( $attachment, $post_id = false, $is_product_video = false ) {
		global $iconic_woothumbs_class, $post;

		$attachment_id = is_numeric( $attachment ) ? absint( $attachment ) : false;
		$media_url     = $attachment_id ? self::get_media_url( $attachment_id ) : trim( $attachment );

		if ( empty( $media_url ) ) {
			return false;
		}

		// Is the URL from YouTube or Vimeo.
		preg_match( '/youtube|youtu\.be|vimeo/i', $media_url, $matches );
		$is_youtube_or_vimeo = ! empty( $matches[0] );

		// Is the URL an MP4/WEBM?
		preg_match( '#^(http|https)://.+\.(mp4|MP4|mpeg4|WEBM|webm)(?=\?|$)#i', $media_url, $matches );
		$is_mp4 = ! empty( $matches[0] );

		if ( $is_mp4 ) {
			$embed = self::get_mp4_embed( $media_url, $attachment_id );
		} elseif ( $is_youtube_or_vimeo ) {
			$media_url = str_replace( 'youtube.com/shorts/', 'youtube.com/embed/', $media_url );
			$media_url = str_replace( '//vimeo.com', '//player.vimeo.com/video', $media_url );
			$embed     = '<div class="js-plyr-div" data-plyr-provider="%plyr_provider%" data-plyr-embed-id="' . esc_url( $media_url ) . '" data-plyr-options="%plyr_options%"></div>';
		} else {
			$embed = '<iframe src="' . esc_url( $media_url ) . '" frameborder="0"></iframe>';
		}

		// Add classes to disable lazyloading for iframes, and improve theme compatibility.
		if ( false !== strpos( $embed, '<iframe' ) ) {
			$lazy_classes   = 'no-lazyload skip-lazy';
			$compat_classes = 'iframe-embed';
			$iframe_classes = $lazy_classes . ' ' . $compat_classes;
			$has_class      = false !== strpos( $embed, 'class="' );
			$replace        = $has_class ? 'class="' : '<iframe';
			$with           = $has_class ? 'class="' . $iframe_classes . '"' : '<iframe class="' . $iframe_classes . '"';

			$embed = str_replace( $replace, $with, $embed );
		}

		$attachment = $attachment_id ? $attachment_id : $attachment;

		$embed = apply_filters_deprecated( 'iconic_woothumbs_oembed_html', array( $embed ), '5.5.0', 'iconic_woothumbs_embed_html' );
		/**
		 * Filter the embed HTML output.
		 *
		 * @since 5.0.0
		 * @param string $embed         Video/iframe embed output.
		 * @param string $media_url     URL of the media in question.
		 * @param int    $attachment_id WordPress media library attachment ID.
		 */
		$embed             = apply_filters( 'iconic_woothumbs_embed_html', $embed, $media_url, $attachment_id );
		$use_poster        = boolval( $iconic_woothumbs_class->settings['media_general_poster'] );
		$poster_gallery    = '';
		$poster_fullscreen = '';

		if ( $use_poster ) {
			$poster_gallery    = $use_poster && is_numeric( $attachment_id ) ? wp_get_attachment_image_url( $attachment_id, 'woocommerce_single ' ) : '';
			$poster_fullscreen = $use_poster && is_numeric( $attachment_id ) ? wp_get_attachment_image_url( $attachment_id, 'large ' ) : '';

			/**
			 * Whether to use the featured image of the product
			 * as the poster for the "global" product video.
			 *
			 * @since 5.0.0
			 * @param boolean $use Boolean true to show.
			 */
			if ( is_string( $attachment ) && ! $poster_gallery && apply_filters( 'iconic_woothumbs_global_video_poster_use_featured', true ) ) {
				// If we don't have the post ID, we could be in the context of
				// the WC single product block, so let's attempt to get the ID.
				if ( ! $post_id ) {
					$post_id = Iconic_WooThumbs_Helpers::get_single_product_block_product_id( $post );
				}

				$product = wc_get_product( $post_id );
				
				if ( $product ) {
					$featured_image_id = $product->get_image_id();

					if ( $featured_image_id ) {
						$poster_gallery    = wp_get_attachment_image_url( $featured_image_id, 'woocommerce_single' );
						$poster_fullscreen = wp_get_attachment_image_url( $featured_image_id, $iconic_woothumbs_class->settings['display_images_large_image_size'] );
					}
				}
			}
		}

		// Prepare classes for the responsive media wrapper.
		$classes = array( 'iconic-woothumbs-responsive-media' );

		if ( $is_mp4 || $is_youtube_or_vimeo ) {
			$classes[] = 'plyr__video-embed';
		}

		if ( ! $is_mp4 && $is_youtube_or_vimeo ) {
			$classes[] = 'iconic-woothumbs-plyr';
		}

		if ( ! $is_mp4 && ! $is_youtube_or_vimeo ) {
			$classes[] = 'iconic-woothumbs-standard-embed';
		}

		// Standard embeds still need the aspect ratio CSS padding.
		$style = '';
		if ( ! $is_mp4 && ! $is_youtube_or_vimeo ) {
			$style = 'padding-bottom: ' . self::get_media_aspect_ratio( $attachment_id, true ) . '%';
		}

		$media_aspect_ratio = ( $is_product_video ) ? self::get_global_media_aspect_ratio() : self::get_media_aspect_ratio( $attachment_id, false, $is_product_video );

		return sprintf(
			'<div class="%s" data-aspect-ratio="%s" data-orientation="%s" data-poster-gallery="%s" data-poster-fullscreen="%s" style="%s">%s</div>%s',
			implode( ' ', $classes ),
			$media_aspect_ratio,
			self::get_media_url_orientation( $attachment_id ),
			$poster_gallery,
			$poster_fullscreen,
			$style,
			$embed,
			( $is_mp4 || $is_youtube_or_vimeo ) ? Iconic_WooThumbs::get_loading_overlay() : ''
		);
	}

	/**
	 * Get media attachment ID by URL if possible.
	 *
	 * @param string|int $attachment Media attachment.
	 *
	 * @return string
	 */
	public static function get_media_url_orientation( $attachment ) {
		$orientation_wide   = 'wide';
		$orientation_tall   = 'tall';
		$orientation_square = 'square';

		// If $attachment is an attachment ID, then we're in a gallery images
		// context, and can get the aspect ratio meta as normal.
		if ( $attachment && is_int( $attachment ) ) {
			$aspect_ratio = self::get_media_aspect_ratio( $attachment, false );
			$ratio_parts  = explode( ':', $aspect_ratio );

			if ( count( $ratio_parts ) === 2 && $ratio_parts[0] === $ratio_parts[1] ) {
				return $orientation_square;
			}

			if ( count( $ratio_parts ) === 2 && $ratio_parts[0] < $ratio_parts[1] ) {
				return $orientation_tall;
			}
		}

		// If $attachment is a string, then we're in a gallery video context,
		// and need to get the attachment ID, then metadata, to determine orientation.
		if ( $attachment && is_string( $attachment ) ) {
			$attachment_postid = attachment_url_to_postid( $attachment );

			if ( ! $attachment_postid ) {
				return $orientation_wide;
			}

			$media_metadata = wp_get_attachment_metadata( $attachment_postid );

			if ( $media_metadata['width'] === $media_metadata['height'] ) {
				return $orientation_square;
			}

			if ( $media_metadata && $media_metadata['width'] < $media_metadata['height'] ) {
				return $orientation_tall;
			}
		}

		$ratio_parts = explode( ':', Iconic_WooThumbs_Helpers::get_global_aspect_ratio() );

		if ( count( $ratio_parts ) === 2 && $ratio_parts[0] < $ratio_parts[1] ) {
			return $orientation_tall;
		}

		return $orientation_wide;
	}

	/**
	 * Add thumbnail play icon.
	 *
	 * @param array $image Image data.
	 * @param int   $i     Image index.
	 */
	public static function thumbnail_play_icon( $image, $i ) {
		// Do not display the play icon if there is no media embed, or the
		// embed starts with a <script> tag e.g. Product Configurator layers.
		if ( empty( $image['media_embed'] ) || false !== strpos( $image['media_embed'], '<script', 0 ) ) {
			return;
		}
		?>
		<div class="iconic-woothumbs-thumbnails__play-overlay">
			<?php Iconic_WooThumbs_Icons::get_svg_icon( 'video' ); ?>
		</div>
		<?php
	}

	/**
	 * Modify single image sizes.
	 *
	 * @param int $data          Single image data.
	 * @param int $attachment_id Attachment ID.
	 *
	 * @return bool|array
	 */
	public static function single_image_data( $data, $attachment_id ) {
		static $processed = array();

		if ( ! empty( $processed[ $attachment_id ] ) ) {
			return $processed[ $attachment_id ];
		}

		if ( empty( $data ) ) {
			return $data;
		}

		if ( 'placeholder' === $attachment_id ) {
			return $data;
		}

		$data['media_embed']             = self::get_media_embed( $attachment_id );
		$data['media_embed_is_standard'] = ( strpos( $data['media_embed'], 'iconic-woothumbs-standard-embed' ) !== false );
		$data['aspect']                  = ! empty( $data['media_embed'] ) ? self::get_media_aspect_ratio( $attachment_id ) : Iconic_WooThumbs_Images::get_image_aspect_ratio( $attachment_id );

		$processed[ $attachment_id ] = $data;

		return $data;
	}

	/**
	 * Get formatted MP4/WEBM embed.
	 *
	 * @param null|string $media_url     Media URL.
	 * @param null|int    $attachment_id Attachment ID.
	 *
	 * @return string
	 */
	public static function get_mp4_embed( $media_url = null, $attachment_id = null ) {
		if ( empty( $media_url ) ) {
			return '';
		}

		global $iconic_woothumbs_class;

		$controls          = boolval( $iconic_woothumbs_class->settings['media_general_controls'] );
		$loop              = boolval( $iconic_woothumbs_class->settings['media_general_loop'] );
		$lazyload_video    = boolval( $iconic_woothumbs_class->settings['media_mp4_lazyload'] );
		$use_poster        = boolval( $iconic_woothumbs_class->settings['media_general_poster'] );
		$poster_gallery    = $use_poster && is_numeric( $attachment_id ) ? wp_get_attachment_image_url( $attachment_id, 'woocommerce_single' ) : '';
		$poster_fullscreen = $use_poster && is_numeric( $attachment_id ) ? wp_get_attachment_image_url( $attachment_id, $iconic_woothumbs_class->settings['display_images_large_image_size'] ) : '';
		$preload           = $lazyload_video ? 'none' : 'metadata';

		$class = array();
		$class = array_filter( $class );

		$atts   = array( 'playsinline', 'crossorigin' );
		$atts[] = $controls ? 'controls' : '';
		$atts[] = $loop ? 'loop' : '';
		/**
		 * Filter MP4 video attributes.
		 *
		 * @since 5.0.0
		 * @param array  $atts      Video attributes.
		 * @param string $media_url Media URL.
		 */
		$atts = apply_filters( 'iconic_woothumbs_mp4_video_attributes', array_filter( $atts ), $media_url );

		if ( ! $attachment_id ) {
			$attachment_id = $media_url;
		}

		$video_type = 'video/mp4';

		if ( str_contains( $media_url, 'webm' ) || str_contains( $media_url, 'WEBM' ) ) {
			$video_type = 'video/webm';
		}

		$return = sprintf(
			'<video class="iconic-woothumbs-responsive-media__manual-embed iconic-woothumbs-plyr intrinsic-ignore %s" %s data-poster-gallery="%s" data-poster-fullscreen="%s" data-aspect-ratio="%s" data-orientation="%s" preload="%s"><source src="%s" type="%s"></video>',
			esc_attr( implode( ' ', $class ) ),
			implode( ' ', $atts ),
			esc_url( $poster_gallery ),
			esc_url( $poster_fullscreen ),
			esc_attr( self::get_media_aspect_ratio( $attachment_id, false ) ),
			esc_attr( self::get_media_url_orientation( $attachment_id ) ),
			esc_attr( $preload ),
			esc_url( $media_url ),
			esc_attr( $video_type )
		);

		return $return;
	}
}
