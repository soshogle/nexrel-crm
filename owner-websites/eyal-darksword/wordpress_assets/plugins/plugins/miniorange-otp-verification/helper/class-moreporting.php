<?php
/**
 * Load administrator changes for Miniorange Gateway
 *
 * @package miniorange-otp-verification/helper
 */

namespace OTP\Helper;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Traits\Instance;
use OTP\Helper\MoPHPSessions;
use OTP\Helper\FormSessionVars;
require_once ABSPATH . 'wp-admin/includes/upgrade.php';

/**
 * This class has transaction reporting specific Content
 */
if ( ! class_exists( 'MoReporting' ) ) {
	/**
	 * MoReporting class
	 */
	class MoReporting {

		use Instance;

		/**
		 * Constructor
		 */
		public function __construct() {
			if ( get_mo_option( 'is_mo_report_enabled' ) ) {
				$this->mo_create_reporting_table();
				$this->check_and_migrate_table_structure();
			}
			add_filter( 'mo_start_reporting', array( $this, 'mo_start_reporting' ), 1, 6 );
			add_filter( 'mo_update_reporting', array( $this, 'mo_update_reporting' ), 1, 2 );
			add_action( 'admin_init', array( $this, 'mo_routedata' ), 1 );
			add_action( 'wp_ajax_mo_generate_report', array( $this, 'mo_generate_report' ) );
			add_action( 'wp_ajax_nopriv_mo_generate_report', array( $this, 'mo_generate_report' ) );
			add_action( 'wp_ajax_mo_toggle_report', array( $this, 'mo_toggle_report' ) );
			add_action( 'wp_ajax_nopriv_mo_toggle_report', array( $this, 'mo_toggle_report' ) );
		}
		/**
		 * This function is to generate reporting.
		 */
		public function mo_routedata() {
			if ( ( ! isset( $_POST['_wpnonce'] ) || ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['_wpnonce'] ) ), 'mo_admin_actions' ) ) ) {
				return;
			}
			$data = MoUtility::mo_sanitize_array( wp_unslash( $_POST ) );

			if ( isset( $data['action'] ) && ( 'mo_download_report' === $data['action'] ) ) {
				$this->mo_download_report( $data );
			}
			if ( isset( $data['action'] ) && ( 'mo_delete_report' === $data['action'] ) ) {
				$this->mo_delete_report( $data );
			}
		}
		/**
		 * This function is to enable/disable reporting.
		 */
		public function mo_toggle_report() {
			if ( ! check_ajax_referer( 'motogglereportnonce', 'security', false ) ) {
				return;
			}
			if ( ! current_user_can( 'manage_options' ) ) {
				return;
			}
			$data = MoUtility::mo_sanitize_array( $_POST );
			if ( isset( $data['mo_is_report_enabled'] ) ) {
				$is_report_enabled = intval( $data['mo_is_report_enabled'] );
				update_mo_option( 'is_mo_report_enabled', $is_report_enabled );
				wp_send_json_success();
			} else {
				wp_send_json_error( 'Invalid request' );
			}
		}
		/**
		 * This function is to generate reporting.
		 */
		public function mo_generate_report() {
			global $wpdb;
			if ( ! check_ajax_referer( 'generatereportnonce', 'security', false ) ) {
				return;
			}
			if ( ! current_user_can( 'manage_options' ) ) {
				return;
			}
			$data          = MoUtility::mo_sanitize_array( $_POST );
			$from_date     = $data['mo_from_date'];
			$to_date       = $data['mo_to_date'];
			$search_user   = $data['mo_user_key'];
			$req_type      = $data['mo_request_type'];
			$entries       = $this->get_entries( $from_date, $to_date, $search_user, $req_type );
			$mo_gmt_offset = get_mo_option( 'gmt_offset' );
			if ( 0 !== $mo_gmt_offset ) {
				$mo_timezone = $mo_gmt_offset > 0 ? 'UTC +' . $mo_gmt_offset : 'UTC ' . $mo_gmt_offset;
			} else {
				$mo_timezone = 'UTC';
			}
			if ( ! empty( $entries ) ) {
				$html = '<tr class="mo_report_table_heading">
								<th style="width: 12%;">' . esc_html__( 'Email/Phone', 'miniorange-otp-verification' ) . '</th>
								<th style="width: 20%;">' . esc_html__( 'Form Name', 'miniorange-otp-verification' ) . '</th>
								<th style="width: 15%;">' . esc_html__( 'Message Type', 'miniorange-otp-verification' ) . '</th>
								<th style="width: 10%;">' . esc_html__( 'Status', 'miniorange-otp-verification' ) . '</th>
								<th style="width: 10%;">' . esc_html__( 'IP Address', 'miniorange-otp-verification' ) . '</th>
								<th style="width: 13%;">' . esc_html__( 'Time', 'miniorange-otp-verification' ) . '<br>' . esc_html( $mo_timezone ) . '</th>
							</tr>';
				foreach ( $entries as $value ) {
					$form_name    = isset( $value['form_name'] ) && ! empty( $value['form_name'] )
						? sanitize_text_field( $value['form_name'] )
						: 'N/A';
					$ip_address   = isset( $value['ip_address'] ) && ! empty( $value['ip_address'] )
						? $value['ip_address']
						: 'N/A';
					$contact_info = ! empty( $value['phone'] ) ? $value['phone'] : $value['email'];

					$html .= '<tr class="mo_report_row">
								<td style="padding: 8px 12px; word-break: break-all; text-align: center;">' . esc_html( $contact_info ) . '</td>
								<td style="padding: 8px 12px; text-align: center;">' . esc_html( $form_name ) . '</td>
								<td style="padding: 8px 12px; text-align: center;">' . esc_html( $value['otp_type'] ) . '</td>
								<td style="padding: 8px 12px; text-align: center;">' . esc_html( $value['status'] ) . '</td>
								<td style="padding: 8px 12px; text-align: center;">' . esc_html( $ip_address ) . '</td>
								<td style="padding: 8px 12px; text-align: center; font-size: 0.9em;">' . esc_html( $value['time'] ) . '</td>
							</tr>';
				}
			} else {
				$html = '<tr class="mo_report_table_heading">
							<th style="width: 12%;">' . esc_html__( 'Email/Phone', 'miniorange-otp-verification' ) . '</th>
							<th style="width: 20%;">' . esc_html__( 'Form Name', 'miniorange-otp-verification' ) . '</th>
							<th style="width: 15%;">' . esc_html__( 'Message Type', 'miniorange-otp-verification' ) . '</th>
							<th style="width: 10%;">' . esc_html__( 'Status', 'miniorange-otp-verification' ) . '</th>
							<th style="width: 10%;">' . esc_html__( 'IP Address', 'miniorange-otp-verification' ) . '</th>
							<th style="width: 13%;">' . esc_html__( 'Time', 'miniorange-otp-verification' ) . '</th>
						</tr>
						<tr class="mo_report_row">
							<td colspan="6" style="text-align: center; padding: 2rem; color: #666;">' . esc_html__( 'No results found', 'miniorange-otp-verification' ) . '</td>
						</tr>';
			}
			wp_send_json(
				(
					MoUtility::create_json(
						$html,
						MoConstants::SUCCESS_JSON_TYPE
					)
				)
			);
		}
		/**
		 * This function is to download report.
		 *
		 * @param array $data - Data submitted by the user.
		 */
		public function mo_download_report( $data ) {
			global $wpdb;
			if ( ! current_user_can( 'manage_options' ) ) {
				return;
			}
			$from_date = $data['mo_from_date'];
			$to_date   = $data['mo_to_date'];

			// Create cache key based on date range.
			$cache_key   = 'mo_reporting_download_' . md5( $from_date . '_' . $to_date );
			$cache_group = 'mo_reporting';

			// Try to get from cache first.
			$statement = wp_cache_get( $cache_key, $cache_group );
			if ( false === $statement ) {
				// Query database if not in cache.
				$statement = $wpdb->get_results( $wpdb->prepare( "SELECT * FROM `{$wpdb->prefix}mo_reporting` WHERE time BETWEEN %s AND %s ORDER BY time DESC", $from_date, $to_date ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Safe prepared query, results cached with wp_cache_get/wp_cache_set.
				wp_cache_set( $cache_key, $statement, $cache_group, 120 );
			}

			$wp_filename = 'transaction_report_' . gmdate( 'd-m-y' ) . '.csv';

			// Get uploads directory and create subdirectory for transaction reports.
			$upload_dir = wp_upload_dir();
			$report_dir = $upload_dir['basedir'] . '/transaction_reports';
			wp_mkdir_p( $report_dir );

			$wp_filepath = $report_dir . '/' . $wp_filename;

			// Initialize WordPress Filesystem API.
			global $wp_filesystem;
			if ( empty( $wp_filesystem ) ) {
				require_once ABSPATH . '/wp-admin/includes/file.php';
				WP_Filesystem();
			}

			// Build CSV content.
			$csv_content = '';
			$array2      = array(
				'id'         => 'ID',
				'txID'       => 'txId',
				'phone'      => 'phone_number',
				'email'      => 'user_email',
				'form_name'  => 'form_name',
				'otp_type'   => 'otp_type',
				'status'     => 'status',
				'ip_address' => 'ip_address',
				'time'       => 'currentTime',
			);

			// Write CSV header.
			$csv_content .= $this->mo_format_csv_row( $array2 );

			foreach ( $statement as $value ) {
				$date  = strtotime( $value->{'time'} );
				$date2 = gmdate( 'd/M/Y h:i:s', $date );

				$data = array(
					'id'         => $value->{'id'},
					'txID'       => $value->{'txID'},
					'phone'      => $value->{'phone'},
					'email'      => $value->{'email'},
					'form_name'  => isset( $value->{'form_name'} ) ? $value->{'form_name'} : '',
					'otp_type'   => $value->{'otp_type'},
					'status'     => $value->{'status'},
					'ip_address' => isset( $value->{'ip_address'} ) ? $value->{'ip_address'} : 'N/A',
					'time'       => $date2,
				);

				$csv_content .= $this->mo_format_csv_row( $data );
			}

			// Write CSV file using WordPress Filesystem API.
			$wp_filesystem->put_contents( $wp_filepath, $csv_content, FS_CHMOD_FILE );

			ob_end_clean();
			header( 'Content-Description: File Transfer' );
			header( 'Content-Disposition: attachment; filename=' . esc_attr( $wp_filename ) );
			header( 'Content-Type: application/csv;' );

			// Read and output file using WordPress Filesystem API.
			$file_content = $wp_filesystem->get_contents( $wp_filepath );
			if ( false !== $file_content ) {
				echo $file_content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSV file content for download.
			}

			// Delete file using WordPress Filesystem API.
			$wp_filesystem->delete( $wp_filepath );
			exit;
		}

		/**
		 * Format an array as a CSV row.
		 *
		 * @param array $data Array of data to format as CSV row.
		 * @return string CSV formatted row.
		 */
		private function mo_format_csv_row( $data ) {
			$row = array();
			foreach ( $data as $field ) {
				// Escape fields containing commas, quotes, or newlines.
				$field = (string) $field;
				if ( false !== strpos( $field, ',' ) || false !== strpos( $field, '"' ) || false !== strpos( $field, "\n" ) ) {
					$field = '"' . str_replace( '"', '""', $field ) . '"';
				}
				$row[] = $field;
			}
			return implode( ',', $row ) . "\n";
		}

		/**
		 * This function is to delete report.
		 *
		 * @param array $data - Data submitted by the user.
		 */
		public function mo_delete_report( $data ) {
			global $wpdb;
			if ( ! current_user_can( 'manage_options' ) ) {
				return;
			}
			$from_date = $data['mo_from_date'];
			$to_date   = $data['mo_to_date'];
			$db_name   = $wpdb->prefix . 'mo_reporting';

			// Create cache key based on date range.
			$cache_key   = 'mo_reporting_delete_' . md5( $from_date . '_' . $to_date );
			$cache_group = 'mo_reporting';

			// Try to get from cache first.
			$statement = wp_cache_get( $cache_key, $cache_group );
			if ( false === $statement ) {
				// Query database if not in cache.
				$statement = $wpdb->get_results( $wpdb->prepare( "SELECT * FROM `{$wpdb->prefix}mo_reporting` WHERE time BETWEEN %s AND %s ORDER BY time DESC", $from_date, $to_date ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Safe prepared query, results cached with wp_cache_get/wp_cache_set.
				wp_cache_set( $cache_key, $statement, $cache_group, 60 );
			}

			$deleted_count = 0;
			foreach ( $statement as $value ) {
				$result = $wpdb->delete( $db_name, array( 'id' => $value->{'id'} ), array( '%d' ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Delete operation, cache invalidation handled below.
				if ( false !== $result ) {
					++$deleted_count;
				}
			}

			// Invalidate related caches after successful deletions.
			if ( $deleted_count > 0 ) {
				// Invalidate download cache for this date range.
				$download_cache_key = 'mo_reporting_download_' . md5( $from_date . '_' . $to_date );
				wp_cache_delete( $download_cache_key, $cache_group );
				// Invalidate delete cache.
				wp_cache_delete( $cache_key, $cache_group );
			}
		}

		/**
		 * Start the transaction auditing.
		 *
		 * @param string $tx_id - transaction id.
		 * @param string $user_email - email id.
		 * @param string $phone_number - phone number.
		 * @param string $otp_type - otp type.
		 * @param string $message - message.
		 * @param string $status - delivery status.
		 */
		public function mo_start_reporting( $tx_id, $user_email, $phone_number, $otp_type, $message, $status ) {
			global $wpdb;
			$current_time = current_datetime()->format( 'Y-m-d H:i' );
			$otp_type     = strtoupper( $otp_type );
			$form_name    = $this->get_form_name_from_session();
			$db_name      = $wpdb->prefix . 'mo_reporting';
			$data         = array(
				'txID'      => $tx_id,
				'email'     => $user_email,
				'phone'     => $phone_number,
				'form_name' => $form_name,
				'otp_type'  => $otp_type,
				'time'      => $current_time,
				'status'    => $status,
			);
			if ( get_mo_option( 'reporting_table_migration_completed' ) ) {
				$data['ip_address'] = MoUtility::get_current_ip_address();
			}
			if ( get_mo_option( 'is_mo_report_enabled' ) ) {
				$this->insert_report( $db_name, $data );
			}
		}
		/**
		 * Update the transaction auditing.
		 *
		 * @param string $tx_id - transaction id.
		 * @param string $status - delivery status.
		 */
		public function mo_update_reporting( $tx_id, $status ) {
			global $wpdb;
			$current_time = current_datetime()->format( 'Y-m-d H:i' );
			$db_name      = $wpdb->prefix . 'mo_reporting';
			$data         = array(
				'status' => $status,
				'time'   => $current_time,
			);
			if ( get_mo_option( 'reporting_table_migration_completed' ) ) {
				$data['ip_address'] = MoUtility::get_current_ip_address();
			}
			$tally_tx_id = array( 'txID' => $tx_id );
			if ( get_mo_option( 'is_mo_report_enabled' ) ) {
				$this->update_report( $db_name, $data, $tally_tx_id );
			}
		}

		/**
		 * Check and migrate table structure if needed.
		 */
		private function check_and_migrate_table_structure() {
			$table_migration_completed = get_mo_option( 'reporting_table_migration_completed' );

			if ( ! $table_migration_completed ) {
				$migration_result = $this->migrate_table_structure();
				if ( $migration_result ) {
					update_mo_option( 'reporting_table_migration_completed', true );
				}
			}
		}

		/**
		 * Migrate table structure to current version.
		 *
		 * @return bool - True if migration was successful
		 */
		private function migrate_table_structure() {
			global $wpdb;
			$table_name      = $wpdb->prefix . 'mo_reporting';
			$charset_collate = $wpdb->get_charset_collate();

			require_once ABSPATH . 'wp-admin/includes/upgrade.php';

			// Prepare SQL to create/update table with required columns.
			$sql = "CREATE TABLE $table_name (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				time datetime NOT NULL,
				email varchar(100) NOT NULL,
				phone varchar(20) NOT NULL,
				user_id bigint(20) unsigned NOT NULL,
				otp_type varchar(100) NOT NULL,
				ip_address varchar(45) NOT NULL DEFAULT '',
				form_name varchar(100) NOT NULL DEFAULT '',
				PRIMARY KEY  (id)
			) $charset_collate;";

			// dbDelta will create the table if not exists and add missing columns or modify them.
			dbDelta( $sql );

			$migration_success = true;

			$migration_completed = get_mo_option( 'mo_reporting_message_column_dropped' );
			if ( ! $migration_completed ) {
				// Create cache key for column existence check.
				$cache_key   = 'mo_reporting_message_column_exists_' . md5( $table_name );
				$cache_group = 'mo_reporting_schema';

				// Try to get from cache first.
				$message_column_exists = wp_cache_get( $cache_key, $cache_group );
				if ( false === $message_column_exists ) {
					// Query database if not in cache.
					$message_column_exists = $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = 'message'", DB_NAME, $table_name ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Safe prepared query, results cached with wp_cache_get/wp_cache_set.
					// Store in cache for 1 hour (3600 seconds).
					wp_cache_set( $cache_key, $message_column_exists, $cache_group, 3600 );
				}

				if ( 0 !== (int) $message_column_exists ) {
					$result = $wpdb->query( 'ALTER TABLE `' . esc_sql( $table_name ) . '` DROP COLUMN `message`' ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.SchemaChange -- Schema migration operation, rate-limited with option check above.
					if ( false !== $result ) {
						// Mark migration as completed and invalidate cache.
						update_mo_option( 'mo_reporting_message_column_dropped', true );
						wp_cache_delete( $cache_key, $cache_group );
					} else {
						$migration_success = false;
					}
				} else {
					// Column doesn't exist, mark migration as completed.
					update_mo_option( 'mo_reporting_message_column_dropped', true );
				}
			}

			return $migration_success;
		}

		/**
		 * Create transaction auditing table.
		 */
		public function mo_create_reporting_table() {
			global $wpdb;
			$table_name = $wpdb->prefix . 'mo_reporting';

			// Create cache key based on table name.
			$cache_key   = 'mo_reporting_table_exists_' . md5( $table_name );
			$cache_group = 'mo_reporting_tables';

			// Try to get from cache first.
			$table_exists = wp_cache_get( $cache_key, $cache_group );
			if ( false === $table_exists ) {
				// Query database if not in cache.
				$table_exists = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table_name ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Caching implemented with wp_cache_get/wp_cache_set below.
				// Store in cache for 1 hour (3600 seconds).
				wp_cache_set( $cache_key, $table_exists, $cache_group, 3600 );
			}

			if ( $table_exists ) {
				return;
			}

			$mo_collate = $wpdb->get_charset_collate();

			$create_table = "CREATE TABLE IF NOT EXISTS `{$wpdb->prefix}mo_reporting` (
		  id bigint(50) NOT NULL AUTO_INCREMENT,
		  txID varchar(255),
		  phone varchar(55) NOT NULL,
		  email varchar(255) NOT NULL,
		  form_name varchar(100) DEFAULT '' NOT NULL,
		  otp_type varchar(100) NOT NULL,
		  status varchar(55) DEFAULT '' NOT NULL,
		  time datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
		  ip_address varchar(45) DEFAULT '' NOT NULL,
		  PRIMARY KEY  (id),
		  KEY idx_txid (txID),
		  KEY idx_time (time),
		  KEY idx_phone (phone),
		  KEY idx_email (email)
		) $mo_collate;";

			require_once ABSPATH . 'wp-admin/includes/upgrade.php';
			dbDelta( $create_table );
			update_mo_option( 'reporting_table_migration_completed', true );

			// Invalidate cache after table creation.
			wp_cache_delete( $cache_key, $cache_group );
		}
		/**
		 * Insert into database with automatic cleanup of old entries.
		 *
		 * @param string $db - database table name.
		 * @param array  $data - data to insert.
		 * @return bool - True if successful, false otherwise
		 */
		public function insert_report( $db, $data ) {
			global $wpdb;
			$result = $wpdb->insert( $db, $data ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Safe prepared query.
			if ( false === $result ) {
				return false;
			}
			$this->cleanup_old_entries( $db );
			return true;
		}

		/**
		 * Cleanup entries older than 100 days to prevent table bloat.
		 *
		 * @param string $db - database table name.
		 * @return bool - True if cleanup was successful
		 */
		private function cleanup_old_entries( $db ) {
			global $wpdb;

			// Use transient to rate-limit cleanup operations (run at most once per hour).
			$cache_key   = 'mo_reporting_cleanup_last_run';
			$cache_group = 'mo_reporting';
			$last_run    = wp_cache_get( $cache_key, $cache_group );

			// Skip cleanup if it was run within the last hour.
			if ( false !== $last_run && ( time() - $last_run ) < 3600 ) {
				return true;
			}

			$cutoff_date = gmdate( 'Y-m-d H:i:s', strtotime( '-100 days' ) );

			$deleted_count = $wpdb->query( $wpdb->prepare( 'DELETE FROM `' . esc_sql( $db ) . '` WHERE `time` < %s', $cutoff_date ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Cleanup operation.
			// Update last run timestamp in cache (store for 2 hours to ensure cleanup doesn't run too frequently).
			if ( false !== $deleted_count ) {
				wp_cache_set( $cache_key, time(), $cache_group, 7200 );
			}

			return false !== $deleted_count;
		}

		/**
		 * Update databse entries.
		 *
		 * @param string $db - database table name.
		 * @param array  $data - data to update.
		 * @param array  $tally_tx_id - transaction id for WHERE clause.
		 * @return bool - True if successful, false otherwise
		 */
		public function update_report( $db, $data, $tally_tx_id ) {
			global $wpdb;

			$result = $wpdb->update( $db, $data, $tally_tx_id ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Update operation, cache invalidation handled below.

			// Invalidate related caches after successful update.
			if ( false !== $result && isset( $tally_tx_id['txID'] ) ) {
				$cache_group = 'mo_reporting';
				$tx_id       = sanitize_text_field( $tally_tx_id['txID'] );
				// Invalidate transaction-specific cache if it exists.
				// Note: Date-range caches are invalidated in delete/download operations.
				wp_cache_delete( 'mo_reporting_tx_' . md5( $tx_id ), $cache_group );
			}

			return false !== $result;
		}
		/**
		 * Update databse entries.
		 *
		 * @param string $from_date - from date.
		 * @param string $to_date - to date.
		 * @param string $search_user - user.
		 * @param string $req_type - request type.
		 */
		public function get_entries( $from_date, $to_date, $search_user, $req_type ) {
			global $wpdb;

			// Create cache key based on date range, search user, and request type.
			$cache_key   = 'mo_reporting_entries_' . md5( $from_date . '_' . $to_date . '_' . $search_user . '_' . $req_type );
			$cache_group = 'mo_reporting';

			// Try to get from cache first.
			$data_entries = wp_cache_get( $cache_key, $cache_group );
			if ( false === $data_entries ) {
				// Query database if not in cache.
				$data_entries = $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$wpdb->prefix}mo_reporting WHERE time BETWEEN %s AND %s ORDER BY time DESC", $from_date, $to_date ), ARRAY_A ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Safe prepared query, results cached with wp_cache_get/wp_cache_set.

				// Apply filters before caching.
				if ( 'req_all' !== $req_type ) {
					foreach ( $data_entries as $key => $row ) {
						$row_otp_type = strtoupper( $row['otp_type'] );
						$filter_type  = strtoupper( $req_type );

						if ( 'NOTIFICATION' === $filter_type ) {
							if ( 'PHONE' === $row_otp_type || 'EMAIL' === $row_otp_type ) {
								unset( $data_entries[ $key ] );
							}
						} elseif ( $filter_type !== $row_otp_type ) {
							unset( $data_entries[ $key ] );
						}
					}
				}

				if ( ! empty( $search_user ) ) {
					foreach ( $data_entries as $key => $row ) {
						if ( $row['email'] !== $search_user ) {
							unset( $data_entries[ $key ] );
						}
					}
				}

				// Store filtered results in cache for 2 minutes (120 seconds).
				wp_cache_set( $cache_key, $data_entries, $cache_group, 120 );
			}

			return $data_entries;
		}
		/**
		 * Get form name from session variables for reporting.
		 * Optimized version that directly gets the form name from session instead of using reflection.
		 *
		 * @return mixed Form name or null if not found.
		 */
		private function get_form_name_from_session() {
			$form_name = MoPHPSessions::get_session_var( 'current_form_name' );
			return ( null === $form_name || '' === $form_name ) ? '' : sanitize_text_field( wp_unslash( $form_name ) );
		}
	}
}
