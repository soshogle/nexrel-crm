<?php
/**
 * Bulk edit page pagination
 *
 * @package iconic-woothumbs
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

if ( $variations->max_num_pages > 1 ) { ?>

	<form method="get">

		<?php $iconic_woothumbs_class->output_bulk_parameters( array( 'paged' ) ); ?>

		<div class="tablenav" style="margin: 20px 0;">
			<div class="tablenav-pages" style="float: none;">
				<span class="pagination-links">
					<a class="first-page" title="<?php esc_attr_e( 'Go to the first page', 'iconic-woothumbs' ); ?>" href="<?php echo esc_url( $iconic_woothumbs_class->get_pagination_link( 1 ) ); ?>">«</a>

					<?php if ( $paged > 1 ) { ?>
						<a class="prev-page" title="<?php esc_attr_e( 'Go to the previous page', 'iconic-woothumbs' ); ?>" href="<?php echo esc_url( $iconic_woothumbs_class->get_pagination_link( $paged - 1 ) ); ?>">‹</a>
					<?php } ?>

					<span class="paging-input"><label for="current-page-selector" class="screen-reader-text">Select Page</label>
					<input class="current-page" id="current-page-selector" title="<?php esc_attr_e( 'Current page', 'iconic-woothumbs' ); ?>" type="text" name="paged" value="<?php echo esc_attr( $paged ); ?>" size="1"> of <span class="total-pages"><?php echo esc_attr( $variations->max_num_pages ); ?></span></span>

					<?php if ( $paged < $variations->max_num_pages ) { ?>
						<a class="next-page" title="<?php esc_attr_e( 'Go to the next page', 'iconic-woothumbs' ); ?>" href="<?php echo esc_url( $iconic_woothumbs_class->get_pagination_link( $paged + 1 ) ); ?>">›</a>
					<?php } ?>

					<a class="last-page" title="<?php esc_attr_e( 'Go to the last page', 'iconic-woothumbs' ); ?>" href="<?php echo esc_url( $iconic_woothumbs_class->get_pagination_link( $variations->max_num_pages ) ); ?>>">»</a>
				</span>
			</div>
		</div>
	</form>

<?php } ?>
