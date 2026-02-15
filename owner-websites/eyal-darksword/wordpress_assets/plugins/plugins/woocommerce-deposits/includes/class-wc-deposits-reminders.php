<?php
/*Copyright: © 2018 Webtomizer.
License: GNU General Public License v3.0
License URI: http://www.gnu.org/licenses/gpl-3.0.html
*/
namespace Webtomizer\WCDP;
use WP_Query;
use Automattic\WooCommerce\Utilities\OrderUtil;


if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}


class WC_Deposits_Reminders
{

    function __construct()
    {

        //reminder for datepicker setting
        add_action('wc_deposits_job_scheduler', array($this, 'second_payment_datepicker_reminder'));


        //reminder for after X days setting
        $second_payment_reminder = get_option('wc_deposits_enable_second_payment_reminder');
        $partial_payment_reminder = get_option('wc_deposits_enable_partial_payment_reminder');

        if ($second_payment_reminder === 'yes') {

            add_action('wc_deposits_job_scheduler', array($this, 'second_payment_reminder'));

        }

        if ( $partial_payment_reminder === 'yes') {
            add_action('wc_deposits_job_scheduler', array($this, 'payment_plan_partial_payment_reminder'));
        }

        /** PRODUCT BASED REMINDERS */


        //the core reminder cron hook
        add_action('wc_deposits_job_scheduler', array($this, 'second_payment_product_based_reminder'));


    }

    function payment_plan_partial_payment_reminder()
    {

        $reminder_days = get_option('wc_deposits_partial_payment_reminder_x_days_before_due_date');
        $date = date("d-m-Y", current_time('timestamp'));
        $target_due_date = strtotime("$date +{$reminder_days} day");

        if (empty($reminder_days)) return;


        $args = array(
            'post_type' => 'wcdp_payment',
            'post_status' => array('wc-pending', 'wc-failed'),
            'posts_per_page' => -1,
            'meta_query' => array(
                'relation' => 'AND',
                array('key' => '_wc_deposits_payment_type',
                    'value' => 'partial_payment',
                    'compare' => '=',
                ),
                array('key' => '_wc_deposits_partial_payment_date',
                    'compare' => '<=',
                    'value' => $target_due_date,
                ),
                array('key' => '_wc_deposits_partial_payment_date',
                    'compare' => '>=',
                    'value' => strtotime($date) ,
                ),

            ),
        );

        //query for all partially-paid orders
        $partial_payments = new WP_Query($args);
        while ($partial_payments->have_posts()) :
            $partial_payments->the_post();
            $order_id = $partial_payments->post->ID;
            $order = wc_get_order($order_id);
            if($order->get_meta('_wc_deposits_partial_payment_reminder_email_sent') === 'yes') continue;
            $order->update_meta_data('_wc_deposits_partial_payment_reminder_email_sent', 'yes');
            $order->update_meta_data('_wc_deposits_partial_payment_reminder_email_sent_time',  current_time('timestamp'));
            $order->save();
            do_action('woocommerce_deposits_second_payment_reminder_email', $order->get_parent_id(),true,$order->get_id());



        endwhile;
    }


    /**
     * @brief handle second payment reminder email triggered by product datepicker setting
     */
    function second_payment_product_based_reminder()
    {


        $params = array(
            'post_type' => 'product',
            'meta_query' => array(
                array('key' => '_wc_deposits_pbr_reminder_date',
                    'value' => date('d-m-Y'),
                    'compare' => '=',
                )
            ),
            'posts_per_page' => -1

        );
        $wc_query = new WP_Query($params);

        if ($wc_query->have_posts()) {
            while ($wc_query->have_posts()):
                $wc_query->the_post();
                $order_ids = $this->retrieve_orders_ids_from_a_product_id(get_the_ID());
                if (!empty($order_ids)) {
                    foreach ($order_ids as $order_id) {
                        $order = wc_get_order($order_id);
                        if ($order) {
                            $reminder_already_sent = $order->get_meta('_wc_deposits_second_payment_reminder_email_pbr_sent', true);

                            if ($reminder_already_sent !== 'yes') {

                                do_action('woocommerce_deposits_second_payment_reminder_email', $order_id);

                                $order->update_meta_data('_wc_deposits_second_payment_reminder_email_pbr_sent', 'yes');
                                $order->update_meta_data('_wc_deposits_second_payment_reminder_email_pbr_time', current_time('timestamp'));
                                $order->save_meta_data();
                                $order->save();
                            }

                        }

                    }
                }


            endwhile;
            wp_reset_postdata();
        }

    }


    /**
     * @brief handle second payment reminder email triggered by datepicker setting
     */
    function second_payment_datepicker_reminder()
    {

        $reminder_date = get_option('wc_deposits_reminder_datepicker');

        if (date('d-m-Y', current_time('timestamp')) == date('d-m-Y', strtotime($reminder_date))) {

            $args = array(
                'post_type' => 'shop_order',
                'post_status' => 'wc-partially-paid',
                'posts_per_page' => -1
            );

            //query for all partially-paid orders
            $partially_paid_orders = new WP_Query($args);

            while ($partially_paid_orders->have_posts()) :
                $partially_paid_orders->the_post();
                $order_id = $partially_paid_orders->post->ID;

                do_action('woocommerce_deposits_second_payment_reminder_email', $order_id);


            endwhile;


        }

    }

    /**
     * @brief handles second payment reminder email trigger
     */
    public function second_payment_reminder()
    {

        $args = array(
            'post_type' => 'shop_order',
            'post_status' => 'wc-partially-paid',
            'posts_per_page' => -1
        );

        //query for all partially-paid orders
        $partially_paid_orders = new WP_Query($args);

        while ($partially_paid_orders->have_posts()) :
            $partially_paid_orders->the_post();
            $order_id = $partially_paid_orders->post->ID;
            $order = wc_get_order($order_id);

            $deposit_payment_date = $order->get_meta('_wc_deposits_deposit_payment_time', true);
            $reminder_already_sent = $order->get_meta('_wc_deposits_second_payment_reminder_email_sent', true);


            if ($deposit_payment_date > 0 && $reminder_already_sent !== 'yes') {
                $now = strtotime(date('Y-m-d',current_time('timestamp')));
                $duration_since_deposit_paid = $now - intval($deposit_payment_date);

                $days = $duration_since_deposit_paid / (60 * 60 * 24);
                $reminder_duration = get_option('wc_deposits_second_payment_reminder_duration');

                if (intval($days) >= intval($reminder_duration)) {
                    do_action('woocommerce_deposits_second_payment_reminder_email', $order_id);
                    $order->update_meta_data('_wc_deposits_second_payment_reminder_email_sent', 'yes');
                    $order->update_meta_data('_wc_deposits_second_payment_reminder_email_time',  current_time('timestamp'));
                    $order->save_meta_data();

                    $order->save();
                }
            }
        endwhile;
    }

    function retrieve_orders_ids_from_a_product_id($product_id)
    {
        global $wpdb;

        $orders_statuses = "'wc-partially-paid'";


        if ( OrderUtil::custom_orders_table_usage_is_enabled() ) {
            $orders_table = $wpdb->prefix . 'wc_orders';
        } else {
            $orders_table = $wpdb->prefix . 'posts';
        }

        $orders_ids = $wpdb->get_col("
        SELECT DISTINCT woi.order_id
        FROM {$wpdb->prefix}woocommerce_order_itemmeta as woim, 
             {$wpdb->prefix}woocommerce_order_items as woi, 
             $orders_table as o
        WHERE  woi.order_item_id = woim.order_item_id
        AND woi.order_id = o.ID
        AND p.post_status IN ( $orders_statuses )
        AND woim.meta_key LIKE '_product_id'
        AND woim.meta_value LIKE '$product_id'
        ORDER BY woi.order_item_id DESC"
        );
        // Return an array of Orders IDs for the given product ID
        return $orders_ids;
    }

}