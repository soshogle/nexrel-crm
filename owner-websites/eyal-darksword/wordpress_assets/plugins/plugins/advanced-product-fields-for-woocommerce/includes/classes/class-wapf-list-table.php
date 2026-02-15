<?php


namespace SW_WAPF\Includes\Classes {

    class Wapf_List_Table extends \WP_List_Table
    {

        private $count_cache = [];

        public function get_columns() {

            $table_columns = [
                'cb'                => '<input type="checkbox" />', // to display the checkbox for bulk operations.
                'post_title'        => __( 'Title', 'advanced-product-fields-for-woocommerce' ),
                'type'              => __('Type', 'advanced-product-fields-for-woocommerce'),
                'fields'            => __('Fields', 'advanced-product-fields-for-woocommerce'),
                'post_date'	        => __( 'Date', 'advanced-product-fields-for-woocommerce' ),
            ];

            return $table_columns;

        }

        function get_sortable_columns() {

            $sortable_columns = [
                'post_title'    => ['title',false],
                'post_date'     => ['date',false],
            ];

            return $sortable_columns;
        }

        public function column_post_date($post) {
            global $mode;

            if ( '0000-00-00 00:00:00' === $post->post_date ) {
                $t_time    = $h_time = __( 'Unpublished', 'advanced-product-fields-for-woocommerce' );
                $time_diff = 0;
            } else {
                $t_time = get_the_time( __( 'Y/m/d g:i:s a', 'advanced-product-fields-for-woocommerce' ) );
                $m_time = $post->post_date;
                $time   = get_post_time( 'G', true, $post );

                $time_diff = time() - $time;

                if ( $time_diff > 0 && $time_diff < DAY_IN_SECONDS ) {
                    /* translators: see https://developer.wordpress.org/reference/functions/human_time_diff/ */
                    $h_time = sprintf( __( '%s ago', 'advanced-product-fields-for-woocommerce' ), human_time_diff( $time ) );
                } else {
                    $h_time = mysql2date( __( 'Y/m/d', 'advanced-product-fields-for-woocommerce' ), $m_time );
                }
            }

            if ( 'publish' === $post->post_status ) {
                $status = __( 'Published', 'advanced-product-fields-for-woocommerce' );
            } elseif ( 'future' === $post->post_status ) {
                if ( $time_diff > 0 ) {
                    $status = '<strong class="error-message">' . __( 'Missed schedule', 'advanced-product-fields-for-woocommerce' ) . '</strong>';
                } else {
                    $status = __( 'Scheduled', 'advanced-product-fields-for-woocommerce' );
                }
            } else {
                $status = __( 'Last Modified', 'advanced-product-fields-for-woocommerce' );
            }

            $status = apply_filters( 'post_date_column_status', $status, $post, 'date', $mode );

            if ( $status ) {
                echo $status . '<br />';
            }

            if ( 'excerpt' === $mode ) {
                echo apply_filters( 'post_date_column_time', $t_time, $post, 'date', $mode );
            } else {
                echo '<abbr title="' . $t_time . '">' . apply_filters( 'post_date_column_time', $h_time, $post, 'date', $mode ) . '</abbr>';
            }

        }

        public function column_fields($post) {

            if(empty($post->post_content))
                return 0;

            $field_group = Field_Groups::process_data($post->post_content);

            return count($field_group->fields);
        }

        public function column_post_title($post) {

            $actions            = [];
            $post_type_object   = get_post_type_object( $post->post_type );
            $title              = _draft_or_post_title($post);

            if( current_user_can( 'edit_post', $post->ID ) && $post->post_status != 'trash') {
                $actions['edit'] = sprintf(
                    '<a href="%s" aria-label="%s">%s</a>',
                    get_edit_post_link( $post->ID ),
                    /* translators: post title */
                    esc_attr( sprintf( __( 'Edit &#8220;%s&#8221;', 'advanced-product-fields-for-woocommerce' ), $title ) ),
                    __( 'Edit', 'advanced-product-fields-for-woocommerce' )
                );
                if($post->post_status === 'publish') {

                    $url = add_query_arg(
                        [
                            'page' => 'wapf-field-groups',
                            'wapf_duplicate' => $post->ID,
                        ],
                        admin_url( 'admin.php' )
                    );

                    $url = wp_nonce_url( $url, 'wapf_duplicate', '_dupenonce' );
                    
                    $actions['duplicate'] = sprintf(
                        '<a href="%s" aria-label="%s">%s</a>',
                        esc_url( $url ),
                        /* translators: post title */
                        esc_attr( sprintf( __( 'Duplicate &#8220;%s&#8221;','advanced-product-fields-for-woocommerce' ), $title ) ),
                        __( 'Duplicate', 'advanced-product-fields-for-woocommerce' )
                    );
                }
            }

            if( current_user_can('delete_post', $post->ID)) {

                if($post->post_status === 'trash') {
                    $actions['untrash'] = sprintf(
                        '<a href="%s" aria-label="%s">%s</a>',
                        wp_nonce_url( admin_url( sprintf( $post_type_object->_edit_link . '&amp;action=untrash', $post->ID ) ), 'untrash-post_' . $post->ID ),
                        /* translators: post title */
                        esc_attr( sprintf( __( 'Restore &#8220;%s&#8221; from the Trash', 'advanced-product-fields-for-woocommerce' ), $title ) ),
                        __( 'Restore', 'advanced-product-fields-for-woocommerce' )
                    );
                }

                if($post->post_status === 'trash') {
                    $actions['delete'] = sprintf(
                        '<a href="%s" class="submitdelete" aria-label="%s">%s</a>',
                        get_delete_post_link( $post->ID, '', true ),
                        /* translators: post title */
                        esc_attr( sprintf( __( 'Delete &#8220;%s&#8221; permanently', 'advanced-product-fields-for-woocommerce' ), $title ) ),
                        __( 'Delete Permanently', 'advanced-product-fields-for-woocommerce' )
                    );
                }

                if($post->post_status !== 'trash') {
                    $actions['trash'] = sprintf(
                        '<a href="%s" class="submitdelete" aria-label="%s">%s</a>',
                        get_delete_post_link( $post->ID ),
                        /* translators: post title */
                        esc_attr( sprintf( __( 'Move &#8220;%s&#8221; to the Trash', 'advanced-product-fields-for-woocommerce' ), $title ) ),
                        _x( 'Trash', 'verb', 'advanced-product-fields-for-woocommerce' )
                    );
                }

            }

            return sprintf(
                '<strong><a class="row-title" href="%s">%s</a>%s</strong>%s',
                get_edit_post_link($post->ID),
                esc_html($title),
                $post->post_status === 'draft' || $post->post_status === 'private' ? ' &mdash; <span class="post-state">' . ( $post->post_status === 'draft' ? __('Draft','advanced-product-fields-for-woocommerce') : __('Private','advanced-product-fields-for-woocommerce') ) . '</span>' : '',
                $this->row_actions($actions)
            );

        }

        public function column_type($post) {

            return Helper::cpt_to_string($post->post_type);

        }

        public function column_cb($post) {
            return sprintf(
                '<input type="checkbox" name="fieldgroups[]" value="%s" />', $post->ID
            );
        }

        public function column_default( $post, $column_name ) {

            return esc_html($post->{$column_name});

        }

        public function no_items() {

            esc_html_e( 'No Product Field Groups found.', 'advanced-product-fields-for-woocommerce');

        }

        public function get_bulk_actions() {

            $actions = [
                'trash'    => __('Move to Trash', 'advanced-product-fields-for-woocommerce')
            ];

            return $actions;
        }

        public function process_bulk_actions() {

            if($this->current_action() === 'trash' && isset($_POST['fieldgroups'])) {
                foreach($_POST['fieldgroups'] as $post_id) {
                    if(current_user_can('delete_post', $post_id)) {
                        $post = get_post($post_id);
                        if($post && $post->post_status === 'trash')
                            wp_delete_post($post_id);
                        else wp_trash_post($post_id);
                    }
                }
                wp_safe_redirect(admin_url('admin.php?page=wapf-field-groups'));
            }

        }

        public function get_views() {

            $counts = $this->get_all_counts();
            $status = $this->get_current_post_status();

            $status_links = [];


            // Always show 'all'
            $status_links['all'] = sprintf('<a href="%s" class="%s">%s</a> (%d)', admin_url('admin.php?page=wapf-field-groups'), $status === 'all' ? 'current' : '',  __('All', 'advanced-product-fields-for-woocommerce'), $counts['all']);

            if($counts['publish']>0)
                $status_links['publish'] = sprintf('<a href="%s" class="%s">%s</a> (%d)',admin_url('admin.php?page=wapf-field-groups&post_status=publish'), $status === 'publish' ? 'current' : '', __('Published', 'advanced-product-fields-for-woocommerce'), $counts['publish']);

            if($counts['draft']>0)
                $status_links['draft'] = sprintf('<a href="%s" class="%s">%s</a> (%d)',admin_url('admin.php?page=wapf-field-groups&post_status=draft'), $status === 'draft' ? 'current' : '',__('Draft', 'advanced-product-fields-for-woocommerce'), $counts['draft']);

            if($counts['trash']>0)
                $status_links['trash'] = sprintf('<a href="%s" class="%s">%s</a> (%d)',admin_url('admin.php?page=wapf-field-groups&post_status=trash'), $status === 'trash' ? 'current' : '',__('Trash', 'advanced-product-fields-for-woocommerce'), $counts['trash']);

            return $status_links;
        }

        public function prepare_items() {

            // Columns
            $columns                = $this->get_columns();
            $hidden                 = [];
            $sortable               = $this->get_sortable_columns();
            $this->_column_headers  = [$columns, $hidden, $sortable];

            // Config
            $items_per_page         = 10; // TODO: get from a screen option.
            $page                   = isset($_GET['paged']) ? $_GET['paged'] : 1;
            $status                 = $this->get_current_post_status();

            // Options for get_posts()
            $query_options = [
                'post_type'     => wapf_get_setting('cpts'),
                'numberposts'   => $items_per_page,
                'paged'         => $page,
                'post_status'   => $status === 'all' ? [ 'publish', 'draft', 'future', 'pending', 'private' ] : $status
            ];

            // Pagination
            $this->set_pagination_args([
                'total_items' => $this->get_all_counts()[$status],
                'per_page'    => $items_per_page
            ]);

            // Handle sorting
            if(!empty($_GET['orderby']))
                $query_options['orderby'] = $_GET['orderby'];

            if(!empty($_GET['order']))
                $query_options['order'] = strtoupper($_GET['order']);

            // Process bulk actions
            $this->process_bulk_actions();


            // Finally, get the data
            $posts = get_posts($query_options);
            $this->items = $posts;

        }

        private function get_current_post_status() {

            $status = 'all';

            if(!empty($_GET['post_status'])) {
                switch ($_GET['post_status']) {
                    case 'publish': $status = 'publish'; break;
                    case 'draft': $status = 'draft'; break;
                    case 'trash': $status = 'trash'; break;
                }
            }
            return $status;
        }

        private function get_all_counts() {

            if(!empty($this->count_cache))
                return $this->count_cache;

            $this->count_cache = Helper::get_fieldgroup_counts();

            return $this->count_cache;

        }
    }
}