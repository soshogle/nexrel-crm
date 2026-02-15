<?php
/**
 * Layout: Slider — Loop thumbnail slider images.
 *
 * @package iconic-woothumbs
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

$thumbs_mode = ( 'above' === $args['navigation_thumbnails_position'] || 'below' === $args['navigation_thumbnails_position'] ) ? 'horizontal' : 'vertical';
?>

<?php
if ( ! empty( $args['images'] ) ) {
	/**
	 * Hook: iconic_woothumbs_before_thumbnails_wrap
	 */
	do_action( 'iconic_woothumbs_before_thumbnails_wrap' );
	?>

	<div class="iconic-woothumbs-thumbnails-wrap iconic-woothumbs-thumbnails-wrap--<?php echo esc_attr( $args['navigation_thumbnails_type'] ); ?> iconic-woothumbs-thumbnails-wrap--<?php echo esc_attr( $thumbs_mode ); ?> iconic-woothumbs-thumbnails-wrap--hidden">

		<?php
		/**
		 * Hook: iconic_woothumbs_before_thumbnails
		 */
		do_action( 'iconic_woothumbs_before_thumbnails' );
		?>

		<div class="iconic-woothumbs-thumbnails">

			<?php
			$image_count = count( $args['images'] );

			if ( $image_count > 1 ) {
				$i = 0;
				foreach ( $args['images'] as $image ) :
					$classes             = ( 0 === $i ) ? 'iconic-woothumbs-thumbnails__slide--active' : '';
					$global_aspect_ratio = Iconic_WooThumbs_Helpers::get_global_aspect_ratio( 'gallery_thumbnail' );
					$inline_aspect_ratio = ( $global_aspect_ratio ) ? 'aspect-ratio: ' . str_replace( ':', '/', $global_aspect_ratio ) . ';' : '';
					?>

					<div class="iconic-woothumbs-thumbnails__slide <?php echo esc_attr( $classes ); ?>" data-index="<?php echo esc_attr( $i ); ?>">

						<div class="iconic-woothumbs-thumbnails__image-wrapper">

							<?php
							/**
							 * Hook: iconic_woothumbs_before_thumbnail
							 *
							 * @param array $image Array of image data.
							 * @param int   $index Index of the image in the list of thumbnails.
							 */
							do_action( 'iconic_woothumbs_before_thumbnail', $image, $i );

							$lazy_classes   = ( 'sliding' === $args['navigation_thumbnails_type'] ) ? 'no-lazyload skip-lazy' : '';
							$src            = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
							$data_lazy_attr = '';
							$loading_attr   = ( 'stacked' === $args['navigation_thumbnails_type'] ) ? 'loading="lazy"' : '';

							if ( 'stacked' === $args['navigation_thumbnails_type'] ) {
								$src = $image['gallery_thumbnail_src'];
							}

							if ( 'sliding' === $args['navigation_thumbnails_type'] ) {
								$thumbs_count = $args['navigation_thumbnails_count'];

								// Do not lazy load the thumbnails that appear
								// as part of the initial PHP render, if the index
								// is less than the thumbnails count setting value.
								if ( $i < $thumbs_count ) {
									$src = $image['gallery_thumbnail_src'];
								} else {
									$data_lazy_attr = 'data-lazy=' . $image['gallery_thumbnail_src'];
								}
							}
							?>

							<img
							style="<?php echo esc_attr( $inline_aspect_ratio ); ?>"
							class="iconic-woothumbs-thumbnails__image <?php echo esc_attr( $lazy_classes ); ?>"
							src="<?php echo esc_attr( $src ); ?>"
							data-srcset="<?php echo esc_attr( $image['gallery_thumbnail_srcset'] ); ?>"
							data-sizes="<?php echo esc_attr( $image['gallery_thumbnail_sizes'] ); ?>"
							title="<?php echo esc_attr( $image['title'] ); ?>"
							alt="<?php echo esc_attr( $image['alt'] ); ?>"
							width="<?php echo esc_attr( $image['gallery_thumbnail_src_w'] ); ?>"
							height="<?php echo esc_attr( $image['gallery_thumbnail_src_h'] ); ?>"
							nopin="nopin"
							<?php
							echo esc_html( $data_lazy_attr );
							echo esc_html( $loading_attr );
							?>
							>

							<?php
							/**
							 * Hook: iconic_woothumbs_after_thumbnail
							 *
							 * @param array $image Array of image data.
							 * @param int   $index Index of the image in the list of thumbnails.
							 */
							do_action( 'iconic_woothumbs_after_thumbnail', $image, $i );
							?>

						</div>

					</div>

					<?php
					$i ++;
				endforeach;

				// pad out thumbnails if there are less than the number
				// which are meant to be shown.

				if ( $image_count < $args['navigation_thumbnails_count'] ) {
					$empty_count = $args['navigation_thumbnails_count'] - $image_count;
					$i           = 0;

					while ( $i < $empty_count ) {
						echo '<div></div>';
						$i ++;
					}
				}
			}
			?>

		</div>

		<?php
		if ( 'sliding' === $args['navigation_thumbnails_type'] && $args['navigation_general_controls'] ) {
			?>
			<a href="javascript: void(0);" class="iconic-woothumbs-thumbnails__control iconic-woothumbs-thumbnails__control--<?php echo ( 'horizontal' === $thumbs_mode ) ? 'left' : 'up'; ?>" data-direction="<?php echo ( is_rtl() && 'horizontal' === $thumbs_mode ) ? 'next' : 'prev'; ?>">
				<?php
				if ( 'horizontal' === $thumbs_mode ) {
					Iconic_WooThumbs_Icons::get_svg_icon( 'arrow-left' );
				} else {
					Iconic_WooThumbs_Icons::get_svg_icon( 'arrow-up' );
				}
				?>
			</a>
			<a href="javascript: void(0);" class="iconic-woothumbs-thumbnails__control iconic-woothumbs-thumbnails__control--<?php echo ( 'horizontal' === $thumbs_mode ) ? 'right' : 'down'; ?>" data-direction="<?php echo ( is_rtl() && 'horizontal' === $thumbs_mode ) ? 'prev' : 'next'; ?>">
				<?php
				if ( 'horizontal' === $thumbs_mode ) {
					Iconic_WooThumbs_Icons::get_svg_icon( 'arrow-right' );
				} else {
					Iconic_WooThumbs_Icons::get_svg_icon( 'arrow-down' );
				}
				?>
			</a>
			<?php
		}

		/**
		 * Hook: iconic_woothumbs_after_thumbnails
		 */
		do_action( 'iconic_woothumbs_after_thumbnails' );
		?>

	</div>

	<?php
	/**
	 * Hook: iconic_woothumbs_after_thumbnails_wrap
	 */
	do_action( 'iconic_woothumbs_after_thumbnails_wrap' );
}
