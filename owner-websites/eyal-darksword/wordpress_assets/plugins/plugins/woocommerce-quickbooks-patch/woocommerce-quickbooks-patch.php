<?php
/**
 * Plugin Name: WooCommerce QuickBooks Integration Patch by Qammar Zaman
 * Description: Patches for WooCommerce QuickBooks integration - adds transaction ID support and phone number handling for invoices
 * Version: 1.0.0
 * Author: Qammar Zaman
 * Author URI: mailto:qammarzaman30@gmail.com
 * Author Email: qammarzaman30@gmail.com
 * Requires at least: 5.0
 * Tested up to: 6.4
 * WC requires at least: 3.0
 * WC tested up to: 8.0
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
class WC_QuickBooks_Patch {
    private static $instance = null;

    public static function get_instance() {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action( 'woocommerce_payment_complete', array( $this, 'payment_complete' ), 10, 1 );
        add_action( 'woocommerce_order_payment_status_changed', array( $this, 'payment_status_changed' ), 10, 2 );
        add_filter( 'vx_crm_post_fields', array( $this, 'enhance_transaction_id' ), 10, 3 );
        add_filter( 'vxc_qbooks_post_data', array( $this, 'ensure_transaction_id_in_data' ), 10, 2 );
        add_filter( 'vxc_qbooks_post_data', array( $this, 'fix_deposit_and_phone' ), 20, 2 );
        add_filter( 'vx_crm_post_fields', array( $this, 'append_phone_to_addresses' ), 20, 3 );
        add_action( 'plugins_loaded', array( $this, 'hook_api_methods' ), 25 );
        add_filter( 'http_request_args', array( $this, 'clean_quickbooks_request_body' ), 10, 2 );
        add_filter( 'quickbooks_woo_objects_list', array( $this, 'add_invoice_phone_field' ), 10, 1 );
    }

    public function payment_complete( $order_id ) {
        $order = wc_get_order( $order_id );
        if ( ! $order ) {
            return;
        }

        $order_status = $order->get_status();
        global $vxc_qbooks;

        if ( isset( $vxc_qbooks ) && is_object( $vxc_qbooks ) && method_exists( $vxc_qbooks, 'push' ) ) {
            $vxc_qbooks->push( $order_id, 'submit' );
            if ( $order_status != 'pending' && $order_status != 'on-hold' ) {
                $vxc_qbooks->push( $order_id, $order_status );
            }
        }
    }

    public function payment_status_changed( $order_id, $status ) {
        if ( $status != 'paid' && $status != 'completed' ) {
            return;
        }

        $order = wc_get_order( $order_id );
        if ( ! $order ) {
            return;
        }

        global $vxc_qbooks;

        if ( isset( $vxc_qbooks ) && is_object( $vxc_qbooks ) && method_exists( $vxc_qbooks, 'push' ) ) {
            $vxc_qbooks->push( $order_id, 'submit' );
            $order_status = $order->get_status();
            if ( $order_status != 'pending' && $order_status != 'on-hold' ) {
                $vxc_qbooks->push( $order_id, $order_status );
            }
        }
    }

    public function enhance_transaction_id( $order, $order_id, $form_id = '' ) {
        $wc_order = wc_get_order( $order_id );
        if ( ! $wc_order ) {
            return $order;
        }

        if ( ! empty( $order['_transaction_id'] ) && ! empty( $order['_transaction_id'][0] ) ) {
            return $order;
        }

        $transaction_id = $this->get_transaction_id( $wc_order );

        if ( ! empty( $transaction_id ) ) {
            $order['_transaction_id'] = array( $transaction_id );
        }

        return $order;
    }

    public function ensure_transaction_id_in_data( $temp, $order_id ) {
        $order = wc_get_order( $order_id );
        if ( ! $order ) {
            return $temp;
        }

        $transaction_id = $this->get_transaction_id( $order );

        if ( empty( $transaction_id ) ) {
            return $temp;
        }

        if ( isset( $temp['DocNumber'] ) && empty( $temp['DocNumber']['value'] ) ) {
            $temp['DocNumber']['value'] = $transaction_id;
        }

        return $temp;
    }

    public function fix_deposit_and_phone( $temp, $order_id ) {
        $numeric_fields = array( 'Deposit', 'ExchangeRate', 'TotalAmt' );

        foreach ( $numeric_fields as $field ) {
            if ( isset( $temp[ $field ] ) && is_array( $temp[ $field ] ) && isset( $temp[ $field ]['value'] ) ) {
                $value = $temp[ $field ]['value'];
                $value = is_string( $value ) ? trim( $value ) : $value;
                if ( $value === '' || $value === null || $value === false || ( ! is_numeric( $value ) && $value !== '0' && $value !== 0 ) ) {
                    unset( $temp[ $field ] );
                } else {
                    $num_value = floatval( $value );
                    if ( $num_value == 0 && $value !== 0 && $value !== '0' ) {
                        unset( $temp[ $field ] );
                    } else {
                        $temp[ $field ]['value'] = $num_value;
                    }
                }
            } elseif ( isset( $temp[ $field ] ) && ! is_array( $temp[ $field ] ) ) {
                $value = $temp[ $field ];
                $value = is_string( $value ) ? trim( $value ) : $value;
                if ( $value === '' || $value === null || $value === false || ( ! is_numeric( $value ) && $value !== '0' && $value !== 0 ) ) {
                    unset( $temp[ $field ] );
                } else {
                    $num_value = floatval( $value );
                    if ( $num_value == 0 && $value !== 0 && $value !== '0' ) {
                        unset( $temp[ $field ] );
                    } else {
                        $temp[ $field ] = array( 'value' => $num_value );
                    }
                }
            }
        }

        if ( isset( $temp['Line'] ) && is_array( $temp['Line'] ) ) {
            foreach ( $temp['Line'] as $line_key => $line_item ) {
                if ( isset( $line_item['Amount'] ) && ( $line_item['Amount'] === '' || $line_item['Amount'] === null ) ) {
                    unset( $temp['Line'][ $line_key ]['Amount'] );
                }
                if ( isset( $line_item['SalesItemLineDetail']['Amount'] ) && ( $line_item['SalesItemLineDetail']['Amount'] === '' || $line_item['SalesItemLineDetail']['Amount'] === null ) ) {
                    unset( $temp['Line'][ $line_key ]['SalesItemLineDetail']['Amount'] );
                }
            }
        }

        if ( isset( $temp['vx_discount_line'] ) ) {
            if ( is_array( $temp['vx_discount_line'] ) && isset( $temp['vx_discount_line']['value'] ) ) {
                $discount_value = $temp['vx_discount_line']['value'];
                if ( $discount_value === '' || $discount_value === null || ( ! is_numeric( $discount_value ) && $discount_value !== '0' && $discount_value !== 0 ) ) {
                    if ( $discount_value !== 0 && $discount_value !== '0' ) {
                        unset( $temp['vx_discount_line'] );
                    } else {
                        $temp['vx_discount_line']['value'] = 0;
                    }
                }
            }
        }

        if ( empty( $temp['CustomerRef'] ) || ( is_array( $temp['CustomerRef'] ) && empty( $temp['CustomerRef']['value'] ) ) ) {
            global $vxc_qbooks;
            if ( isset( $vxc_qbooks ) && is_object( $vxc_qbooks ) && method_exists( $vxc_qbooks, 'get_feed_log' ) ) {
                $feeds = get_posts( array(
                    'post_type'   => 'vxc_qbooks',
                    'post_status' => 'publish',
                    'numberposts' => -1,
                    'fields'      => 'ids'
                ) );

                foreach ( $feeds as $feed_id ) {
                    $feed_meta = get_post_meta( $feed_id, 'vxc_qbooks_meta', true );
                    if ( empty( $feed_meta['object'] ) || $feed_meta['object'] != 'invoice' ) {
                        continue;
                    }
                    $log = $vxc_qbooks->get_feed_log( $feed_id, $order_id, 'invoice', 0 );
                    if ( empty( $log['crm_id'] ) || empty( $feed_meta['account'] ) ) {
                        continue;
                    }
                    $info = $vxc_qbooks->get_info( $feed_meta['account'] );
                    $api = $vxc_qbooks->get_api( $info );
                    if ( ! $api || ! method_exists( $api, 'get_entry' ) ) {
                        continue;
                    }
                    try {
                        $existing_invoice = $api->get_entry( 'invoice', $log['crm_id'] );
                        $customer_ref_value = null;
                        if ( ! empty( $existing_invoice['Invoice']['CustomerRef']['value'] ) ) {
                            $customer_ref_value = $existing_invoice['Invoice']['CustomerRef']['value'];
                        } elseif ( ! empty( $existing_invoice['CustomerRef']['value'] ) ) {
                            $customer_ref_value = $existing_invoice['CustomerRef']['value'];
                        } elseif ( isset( $existing_invoice[0] ) && ! empty( $existing_invoice[0]['Invoice']['CustomerRef']['value'] ) ) {
                            $customer_ref_value = $existing_invoice[0]['Invoice']['CustomerRef']['value'];
                        }
                        if ( ! empty( $customer_ref_value ) ) {
                            $temp['CustomerRef'] = array( 'value' => $customer_ref_value, 'label' => 'Customer' );
                            break;
                        }
                    } catch ( Exception $e ) {
                        continue;
                    }
                }
            }
        }

        $order = wc_get_order( $order_id );
        if ( $order ) {
            $phone = $order->get_billing_phone();
            if ( ! empty( $phone ) ) {
                if ( isset( $temp['BillAddr']['Country'] ) && ! empty( $temp['BillAddr']['Country'] ) ) {
                    $billing_line1 = preg_replace( '/\s*' . preg_quote( $phone, '/' ) . '\s*/', ' ', $temp['BillAddr']['Country'] );
                    $billing_line1 = trim( $billing_line1 );
                    if ( strpos( $billing_line1, $phone ) === false ) {
                        $temp['BillAddr']['Country'] = $billing_line1 . ' | ' . $phone;
                    } else {
                        $temp['BillAddr']['Country'] = $billing_line1;
                    }
                }
                if ( isset( $temp['ShipAddr']['Country'] ) && ! empty( $temp['ShipAddr']['Country'] ) ) {
                    $shipping_line1 = preg_replace( '/\s*' . preg_quote( $phone, '/' ) . '\s*/', ' ', $temp['ShipAddr']['Country'] );
                    $shipping_line1 = trim( $shipping_line1 );
                    if ( strpos( $shipping_line1, $phone ) === false ) {
                        $temp['ShipAddr']['Country'] = $shipping_line1 . ' | ' . $phone;
                    } else {
                        $temp['ShipAddr']['Country'] = $shipping_line1;
                    }
                }
            }
        }

        return $temp;
    }

    public function append_phone_to_addresses( $order, $order_id, $form_id = '' ) {
        $wc_order = wc_get_order( $order_id );
        if ( ! $wc_order ) {
            return $order;
        }

        $phone = $wc_order->get_billing_phone();
        $billing_country = $wc_order->get_billing_country();
        $shipping_country = $wc_order->get_shipping_country();
        if ( empty( $phone ) ) {
            return $order;
        }

        if ( ! empty( $billing_country ) ) {
            if ( strpos( $billing_country, $phone ) === false ) {
                $order['_billing_country'] = $billing_country . ' | ' . $phone;
            }
        }
        if ( ! empty( $shipping_country ) ) {
            if ( strpos( $shipping_country, $phone ) === false ) {
                $order['_shipping_country'] = $shipping_country . ' | ' . $phone;
            }
        }

        return $order;
    }

    private function get_transaction_id( $order ) {
        $transaction_id = '';

        if ( method_exists( $order, 'get_transaction_id' ) ) {
            $transaction_id = $order->get_transaction_id();
        }

        if ( empty( $transaction_id ) ) {
            $transaction_id = $order->get_meta( '_transaction_id' );
        }

        if ( empty( $transaction_id ) ) {
            $payment_method = $order->get_payment_method();
            if ( ! empty( $payment_method ) ) {
                $gateway_meta_keys = array(
                    '_transaction_id',
                    '_ppec_paypal_transaction_id',
                    '_paypal_transaction_id',
                    '_stripe_transaction_id',
                    '_payment_transaction_id',
                    'transaction_id',
                    'Transaction ID',
                    '_payment_method_transaction_id'
                );
                $gateway_meta_keys[] = '_' . $payment_method . '_transaction_id';
                $gateway_meta_keys[] = $payment_method . '_transaction_id';

                foreach ( $gateway_meta_keys as $meta_key ) {
                    $meta_val = $order->get_meta( $meta_key );
                    if ( ! empty( $meta_val ) ) {
                        $transaction_id = $meta_val;
                        break;
                    }
                }
            }
        }

        if ( empty( $transaction_id ) ) {
            $notes = wc_get_order_notes( array( 'order_id' => $order->get_id(), 'limit' => 10 ) );
            foreach ( $notes as $note ) {
                $content = $note->content;
                if ( preg_match( '/(?:transaction|txn|payment)[\s_-]*(?:id|number|ref)[\s:]*([A-Z0-9\-]+)/i', $content, $matches ) ) {
                    if ( ! empty( $matches[1] ) ) {
                        $transaction_id = $matches[1];
                        break;
                    }
                }
            }
        }

        return $transaction_id;
    }

    public function hook_api_methods() {
        add_filter( 'vxc_qbooks_post_data', array( $this, 'final_cleanup_numeric_fields' ), 999, 2 );
    }

    public function clean_quickbooks_request_body( $args, $url ) {
        if ( strpos( $url, 'quickbooks.api.intuit.com' ) === false && 
             strpos( $url, 'sandbox-quickbooks.api.intuit.com' ) === false ) {
            return $args;
        }

        if ( ! empty( $args['body'] ) && is_string( $args['body'] ) ) {
            $json_data = json_decode( $args['body'], true );
            if ( json_last_error() === JSON_ERROR_NONE && is_array( $json_data ) ) {
                $json_data = $this->clean_numeric_fields_recursive( $json_data );
                $args['body'] = json_encode( $json_data );
            }
        }

        return $args;
    }

    private function clean_numeric_fields_recursive( $data ) {
        if ( ! is_array( $data ) ) {
            return $data;
        }

        $numeric_fields = array( 'Deposit', 'ExchangeRate', 'Amount', 'TotalAmt' );
        $cleaned = array();

        foreach ( $data as $key => $value ) {
            if ( in_array( $key, $numeric_fields ) ) {
                if ( $value === '' || $value === null || $value === false ) {
                    continue;
                }
                if ( ! is_numeric( $value ) && $value !== 0 ) {
                    continue;
                }
                $cleaned[ $key ] = is_numeric( $value ) ? floatval( $value ) : $value;
            } elseif ( is_array( $value ) ) {
                $cleaned[ $key ] = $this->clean_numeric_fields_recursive( $value );
            } else {
                $cleaned[ $key ] = $value;
            }
        }

        return $cleaned;
    }

    public function final_cleanup_numeric_fields( $temp, $order_id ) {
        $numeric_fields = array( 'Deposit', 'ExchangeRate' );

        foreach ( $numeric_fields as $field ) {
            if ( isset( $temp[ $field ] ) ) {
                $value = null;
                if ( is_array( $temp[ $field ] ) && isset( $temp[ $field ]['value'] ) ) {
                    $value = $temp[ $field ]['value'];
                } elseif ( ! is_array( $temp[ $field ] ) ) {
                    $value = $temp[ $field ];
                }

                $value = is_string( $value ) ? trim( $value ) : $value;
                if ( $value === '' || $value === null || $value === false ) {
                    unset( $temp[ $field ] );
                }
            }
        }

        return $temp;
    }

    public function add_invoice_phone_field( $objects ) {
        return $objects;
    }
}

add_action( 'plugins_loaded', array( 'WC_QuickBooks_Patch', 'get_instance' ), 20 );
