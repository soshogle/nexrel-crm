<?php
/** Adminer - Compact database management
* @link https://www.adminer.org/
* @author Jakub Vrana, https://www.vrana.cz/
* @copyright 2007 Jakub Vrana
* @license https://www.apache.org/licenses/LICENSE-2.0 Apache License, Version 2.0
* @license https://www.gnu.org/licenses/gpl-2.0.html GNU General Public License, version 2 (one or other)
* @version 5.4.2
*/
// this is matched by compile.php

namespace Adminer;

const VERSION = "5.4.2";

if (!defined('\Lev0\DbAccessAdminer\OK')) { # no direct execution
	exit;
}

error_reporting(24575); // all but E_DEPRECATED (overriding mysqli methods without types is deprecated)
set_error_handler(function ($errno, $errstr) {
	// "Undefined array key" mutes $_GET["q"] if there's no ?q=
	// "Undefined offset" and "Undefined index" are older messages for the same thing
	return !!preg_match('~^Undefined (array key|offset|index)~', $errstr);
}, E_WARNING | E_NOTICE); // warning since PHP 8.0

// this is matched by compile.php


// disable filter.default
$filter = !preg_match('~^(unsafe_raw)?$~', ini_get("filter.default"));
if ($filter || ini_get("filter.default_flags")) {
	foreach (array('_GET', '_POST', '_COOKIE', '_SERVER') as $val) {
		$unsafe = filter_input_array(constant("INPUT$val"), FILTER_UNSAFE_RAW);
		if ($unsafe) {
			$$val = $unsafe;
		}
	}
}

if (function_exists("mb_internal_encoding")) {
	mb_internal_encoding("8bit");
}

// This file is used both in Adminer and Adminer Editor.

/** Get database connection
* @param ?Db $connection2 custom connection to use instead of the default
* @return Db
*/
function connection($connection2 = null) {
	// can be used in customization, Db::$instance is minified
	return ($connection2 ?: Db::$instance);
}

/** Get Adminer object
* @return Adminer|Plugins
*/
function adminer() {
	return Adminer::$instance;
}

/** Get Driver object */
function driver() {
	return Driver::$instance;
}

/** Connect to the database */
function connect() {
	$credentials = adminer()->credentials();
	$return = Driver::connect($credentials[0], $credentials[1], $credentials[2]);
	return (is_object($return) ? $return : null);
}

/** Unescape database identifier
* @param string $idf text inside ``
*/
function idf_unescape($idf) {
	if (!preg_match('~^[`\'"[]~', $idf)) {
		return $idf;
	}
	$last = substr($idf, -1);
	return str_replace($last . $last, $last, substr($idf, 1, -1));
}

/** Shortcut for connection()->quote($string) */
function q($string) {
	return connection()->quote($string);
}

/** Escape string to use inside '' */
function escape_string($val) {
	return substr(q($val), 1, -1);
}

/** Get a possibly missing item from a possibly missing array
* idx($row, $key) is better than $row[$key] ?? null because PHP will report error for undefined $row
* @param ?mixed[] $array
* @param array-key $key
* @param mixed $default
* @return mixed
*/
function idx($array, $key, $default = null) {
	return ($array && array_key_exists($key, $array) ? $array[$key] : $default);
}

/** Remove non-digits from a string; used instead of intval() to not corrupt big numbers
* @return numeric-string
*/
function number($val) {
	return preg_replace('~[^0-9]+~', '', $val);
}

/** Get regular expression to match numeric types */
function number_type() {
	return '((?<!o)int(?!er)|numeric|real|float|double|decimal|money)'; // not point, not interval
}

/** Disable magic_quotes_gpc
* @param mixed[] $values
* @param bool $filter whether to leave values as is
* @return mixed[]
*/
function remove_slashes(array $values, $filter = false) {
	$return = array();
	foreach ($values as $key => $val) {
		$return[stripslashes($key)] = (is_array($val)
			? remove_slashes($val, $filter)
			: ($filter ? $val : stripslashes($val))
		);
	}
	return $return;
}

/** Escape or unescape string to use inside form [] */
function bracket_escape($idf, $back = false) {
	// escape brackets inside name="x[]"
	static $trans = array(':' => ':1', ']' => ':2', '[' => ':3', '"' => ':4');
	return strtr($idf, ($back ? array_flip($trans) : $trans));
}

/** Check if connection has at least the given version
* @param string|float $version required version
* @param string|float $maria_db required MariaDB version
*/
function min_version($version, $maria_db = "", $connection2 = null) {
	$connection2 = connection($connection2);
	$server_info = $connection2->server_info;
	if ($maria_db && preg_match('~([\d.]+)-MariaDB~', $server_info, $match)) {
		$server_info = $match[1];
		$version = $maria_db;
	}
	return $version && version_compare($server_info, $version) >= 0;
}

/** Get connection charset */
function charset(Db $connection) {
	return (min_version("5.5.3", 0, $connection) ? "utf8mb4" : "utf8"); // SHOW CHARSET would require an extra query
}

/** Get INI boolean value */
function ini_bool($ini) {
	$val = ini_get($ini);
	return (preg_match('~^(on|true|yes)$~i', $val) || (int) $val); // boolean values set by php_value are strings
}

/** Get INI bytes value */
function ini_bytes($ini) {
	$val = ini_get($ini);
	switch (strtolower(substr($val, -1))) {
		case 'g':
			$val = (int) $val * 1024; // no break
		case 'm':
			$val = (int) $val * 1024; // no break
		case 'k':
			$val = (int) $val * 1024;
	}
	return $val;
}

/** Check if SID is necessary */
function sid() {
	static $return;
	if ($return === null) { // restart_session() defines SID
		$return = (SID && !($_COOKIE && ini_bool("session.use_cookies"))); // $_COOKIE - don't pass SID with permanent login
	}
	return $return;
}

/** Set password to session */
function set_password($vendor, $server, $username, $password) {
	$_SESSION["pwds"][$vendor][$server][$username] = ($_COOKIE["adminer_key"] && is_string($password)
		? array(encrypt_string($password, $_COOKIE["adminer_key"]))
		: $password
	);
}

/** Get password from session
* @return string|false|null null for missing password, false for expired password
*/
function get_password() {
	$return = get_session("pwds");
	if (is_array($return)) {
		$return = ($_COOKIE["adminer_key"]
			? decrypt_string($return[0], $_COOKIE["adminer_key"])
			: false
		);
	}
	return $return;
}

/** Get single value from database
* @return string|false false if error
*/
function get_val($query, $field = 0, $conn = null) {
	$conn = connection($conn);
	$result = $conn->query($query);
	if (!is_object($result)) {
		return false;
	}
	$row = $result->fetch_row();
	return ($row ? $row[$field] : false);
}

/** Get list of values from database
* @param array-key $column
* @return list<string>
*/
function get_vals($query, $column = 0) {
	$return = array();
	$result = connection()->query($query);
	if (is_object($result)) {
		while ($row = $result->fetch_row()) {
			$return[] = $row[$column];
		}
	}
	return $return;
}

/** Get keys from first column and values from second
* @return string[]
*/
function get_key_vals($query, $connection2 = null, $set_keys = true) {
	$connection2 = connection($connection2);
	$return = array();
	$result = $connection2->query($query);
	if (is_object($result)) {
		while ($row = $result->fetch_row()) {
			if ($set_keys) {
				$return[$row[0]] = $row[1];
			} else {
				$return[] = $row[0];
			}
		}
	}
	return $return;
}

/** Get all rows of result
* @return list<string[]> of associative arrays
*/
function get_rows($query, $connection2 = null, $error = "<p class='error'>") {
	$conn = connection($connection2);
	$return = array();
	$result = $conn->query($query);
	if (is_object($result)) { // can return true
		while ($row = $result->fetch_assoc()) {
			$return[] = $row;
		}
	} elseif (!$result && !$connection2 && $error && (defined('Adminer\PAGE_HEADER') || $error == "-- ")) {
		echo $error . error() . "\n";
	}
	return $return;
}

/** Find unique identifier of a row
* @param string[] $row
* @param Index[] $indexes
* @return string[]|void null if there is no unique identifier
*/
function unique_array($row, array $indexes) {
	foreach ($indexes as $index) {
		if (preg_match("~PRIMARY|UNIQUE~", $index["type"]) && !$index["partial"]) {
			$return = array();
			foreach ($index["columns"] as $key) {
				if (!isset($row[$key])) { // NULL is ambiguous
					continue 2;
				}
				$return[$key] = $row[$key];
			}
			return $return;
		}
	}
}

/** Escape column key used in where() */
function escape_key($key) {
	if (preg_match('(^([\w(]+)(' . str_replace("_", ".*", preg_quote(idf_escape("_"))) . ')([ \w)]+)$)', $key, $match)) { //! columns looking like functions
		return $match[1] . idf_escape(idf_unescape($match[2])) . $match[3]; //! SQL injection
	}
	return idf_escape($key);
}

/** Create SQL condition from parsed query string
* @param array{where:string[], null:list<string>} $where parsed query string
* @param Field[] $fields
*/
function where(array $where, array $fields = array()) {
	$return = array();
	foreach ((array) $where["where"] as $key => $val) {
		$key = bracket_escape($key, true); // true - back
		$column = escape_key($key);
		$field = idx($fields, $key, array());
		$field_type = $field["type"];
		$return[] = $column
			. (JUSH == "sql" && $field_type == "json" ? " = CAST(" . q($val) . " AS JSON)"
				: (JUSH == "pgsql" && preg_match('~^json~', $field_type) ? "::jsonb = " . q($val) . "::jsonb"
				: (JUSH == "sql" && is_numeric($val) && preg_match('~\.~', $val) ? " LIKE " . q($val) // LIKE because of floats but slow with ints
				: (JUSH == "mssql" && strpos($field_type, "datetime") === false ? " LIKE " . q(preg_replace('~[_%[]~', '[\0]', $val)) // LIKE because of text but it does not work with datetime
				: " = " . unconvert_field($field, q($val))))))
		; //! enum and set
		if (JUSH == "sql" && preg_match('~char|text~', $field_type) && preg_match("~[^ -@]~", $val)) { // not just [a-z] to catch non-ASCII characters
			$return[] = "$column = " . q($val) . " COLLATE " . charset(connection()) . "_bin";
		}
	}
	foreach ((array) $where["null"] as $key) {
		$return[] = escape_key($key) . " IS NULL";
	}
	return implode(" AND ", $return);
}

/** Create SQL condition from query string
* @param Field[] $fields
*/
function where_check($val, array $fields = array()) {
	parse_str($val, $check);
	remove_slashes(array(&$check));
	return where($check, $fields);
}

/** Create query string where condition from value
* @param int $i condition order
* @param string $column column identifier
*/
function where_link($i, $column, $value, $operator = "=") {
	return "&where%5B$i%5D%5Bcol%5D=" . urlencode($column) . "&where%5B$i%5D%5Bop%5D=" . urlencode(($value !== null ? $operator : "IS NULL")) . "&where%5B$i%5D%5Bval%5D=" . urlencode($value);
}

/** Get select clause for convertible fields
* @param mixed[] $columns only keys are used
* @param Field[] $fields
* @param list<string> $select
*/
function convert_fields(array $columns, array $fields, array $select = array()) {
	$return = "";
	foreach ($columns as $key => $val) {
		if ($select && !in_array(idf_escape($key), $select)) {
			continue;
		}
		$as = convert_field($fields[$key]);
		if ($as) {
			$return .= ", $as AS " . idf_escape($key);
		}
	}
	return $return;
}

/** Set cookie valid on current path
* @param int $lifetime number of seconds, 0 for session cookie, 2592000 - 30 days
*/
function cookie($name, $value, $lifetime = 2592000) {
	header(
		"Set-Cookie: $name=" . rawurlencode($value)
			. ($lifetime ? "; expires=" . gmdate("D, d M Y H:i:s", time() + $lifetime) . " GMT" : "")
			. "; path=" . preg_replace('~\?.*~', '', $_SERVER["REQUEST_URI"])
			. (HTTPS ? "; secure" : "")
			. "; HttpOnly; SameSite=lax",
		false
	);
}

/** Get settings stored in a cookie
* @return mixed[]
*/
function get_settings($cookie) {
	parse_str($_COOKIE[$cookie], $settings);
	return $settings;
}

/** Get setting stored in a cookie
* @param mixed $default
* @return mixed
*/
function get_setting($key, $cookie = "adminer_settings", $default = null) {
	return idx(get_settings($cookie), $key, $default);
}

/** Store settings to a cookie
* @param mixed[] $settings
*/
function save_settings(array $settings, $cookie = "adminer_settings") {
	$value = http_build_query($settings + get_settings($cookie));
	cookie($cookie, $value);
	$_COOKIE[$cookie] = $value;
}

/** Restart stopped session */
function restart_session() {
	if (!ini_bool("session.use_cookies") && (!function_exists('session_status') || session_status() == 1)) { // 1 - PHP_SESSION_NONE, session_status() available since PHP 5.4
		session_start();
	}
}

/** Stop session if possible */
function stop_session($force = false) {
	$use_cookies = ini_bool("session.use_cookies");
	if (!$use_cookies || $force) {
		session_write_close(); // improves concurrency if a user opens several pages at once, may be restarted later
		if ($use_cookies && @ini_set("session.use_cookies", '0') === false) { // @ - may be disabled
			session_start();
		}
	}
}

/** Get session variable for current server
* @return mixed
*/
function &get_session($key) {
	return $_SESSION[$key][DRIVER][SERVER][$_GET["username"]];
}

/** Set session variable for current server
* @param mixed $val
* @return mixed
*/
function set_session($key, $val) {
	$_SESSION[$key][DRIVER][SERVER][$_GET["username"]] = $val; // used also in auth.inc.php
}

/** Get authenticated URL */
function auth_url($vendor, $server, $username, $db = null) {
	$uri = remove_from_uri(implode("|", array_keys(SqlDriver::$drivers))
		. "|username|ext|"
		. ($db !== null ? "db|" : "")
		. ($vendor == 'mssql' || $vendor == 'pgsql' ? "" : "ns|") // we don't have access to support() here
		. session_name())
	;
	preg_match('~([^?]*)\??(.*)~', $uri, $match);
	return "$match[1]?"
		. (sid() ? SID . "&" : "")
		. ($vendor != "server" || $server != "" ? urlencode($vendor) . "=" . urlencode($server) . "&" : "")
		. ($_GET["ext"] ? "ext=" . urlencode($_GET["ext"]) . "&" : "")
		. "username=" . urlencode($username)
		. ($db != "" ? "&db=" . urlencode($db) : "")
		. ($match[2] ? "&$match[2]" : "")
	;
}

/** Find whether it is an AJAX request */
function is_ajax() {
	return ($_SERVER["HTTP_X_REQUESTED_WITH"] == "XMLHttpRequest");
}

/** Send Location header and exit
* @param ?string $location null to only set a message
*/
function redirect($location, $message = null) {
	if ($message !== null) {
		restart_session();
		$_SESSION["messages"][preg_replace('~^[^?]*~', '', ($location !== null ? $location : $_SERVER["REQUEST_URI"]))][] = $message;
	}
	if ($location !== null) {
		if ($location == "") {
			$location = ".";
		}
		header("Location: $location");
		exit;
	}
}

/** Execute query and redirect if successful
* @param bool $redirect
*/
function query_redirect($query, $location, $message, $redirect = true, $execute = true, $failed = false, $time = "") {
	if ($execute) {
		$start = microtime(true);
		$failed = !connection()->query($query);
		$time = format_time($start);
	}
	$sql = ($query ? adminer()->messageQuery($query, $time, $failed) : "");
	if ($failed) {
		adminer()->error .= error() . $sql . script("messagesPrint();") . "<br>";
		return false;
	}
	if ($redirect) {
		redirect($location, $message . $sql);
	}
	return true;
}

class Queries {
	/** @var string[] */ static $queries = array();
	static $start = 0;
}

/** Execute and remember query
* @param string $query end with ';' to use DELIMITER
* @return Result|bool
*/
function queries($query) {
	if (!Queries::$start) {
		Queries::$start = microtime(true);
	}
	Queries::$queries[] = (driver()->delimiter != ';' ? $query : (preg_match('~;$~', $query) ? "DELIMITER ;;\n$query;\nDELIMITER " : $query) . ";");
	return connection()->query($query);
}

/** Apply command to all array items
* @param list<string> $tables
* @param callable(string):string $escape
*/
function apply_queries($query, array $tables, $escape = 'Adminer\table') {
	foreach ($tables as $table) {
		if (!queries("$query " . $escape($table))) {
			return false;
		}
	}
	return true;
}

/** Redirect by remembered queries
* @param bool $redirect
*/
function queries_redirect($location, $message, $redirect) {
	$queries = implode("\n", Queries::$queries);
	$time = format_time(Queries::$start);
	return query_redirect($queries, $location, $message, $redirect, false, !$redirect, $time);
}

/** Format elapsed time
* @param float $start output of microtime(true)
* @return string HTML code
*/
function format_time($start) {
	return lang(0, max(0, microtime(true) - $start));
}

/** Get relative REQUEST_URI */
function relative_uri() {
	return str_replace(":", "%3a", preg_replace('~^[^?]*/([^?]*)~', '\1', $_SERVER["REQUEST_URI"]));
}

/** Remove parameter from query string */
function remove_from_uri($param = "") {
	return substr(preg_replace("~(?<=[?&])($param" . (SID ? "" : "|" . session_name()) . ")=[^&]*&~", '', relative_uri() . "&"), 0, -1);
}

/** Get file contents from $_FILES
* @return mixed int for error, string otherwise
*/
function get_file($key, $decompress = false, $delimiter = "") {
	$file = $_FILES[$key];
	if (!$file) {
		return null;
	}
	foreach ($file as $key => $val) {
		$file[$key] = (array) $val;
	}
	$return = '';
	foreach ($file["error"] as $key => $error) {
		if ($error) {
			return $error;
		}
		$name = $file["name"][$key];
		$tmp_name = $file["tmp_name"][$key];
		$content = file_get_contents(
			$decompress && preg_match('~\.gz$~', $name)
			? "compress.zlib://$tmp_name"
			: $tmp_name
		); //! may not be reachable because of open_basedir
		if ($decompress) {
			$start = substr($content, 0, 3);
			if (function_exists("iconv") && preg_match("~^\xFE\xFF|^\xFF\xFE~", $start)) { // not ternary operator to save memory
				$content = iconv("utf-16", "utf-8", $content);
			} elseif ($start == "\xEF\xBB\xBF") { // UTF-8 BOM
				$content = substr($content, 3);
			}
		}
		$return .= $content;
		if ($delimiter) {
			$return .= (preg_match("($delimiter\\s*\$)", $content) ? "" : $delimiter) . "\n\n";
		}
	}
	return $return;
}

/** Determine upload error */
function upload_error($error) {
	$max_size = ($error == UPLOAD_ERR_INI_SIZE ? ini_get("upload_max_filesize") : 0); // post_max_size is checked in index.php
	return ($error ? lang(1) . ($max_size ? " " . lang(2, $max_size) : "") : lang(3));
}

/** Create repeat pattern for preg */
function repeat_pattern($pattern, $length) {
	// fix for Compilation failed: number too big in {} quantifier
	return str_repeat("$pattern{0,65535}", $length / 65535) . "$pattern{0," . ($length % 65535) . "}"; // can create {0,0} which is OK
}

/** Check whether the string is in UTF-8 */
function is_utf8($val) {
	// don't print control chars except \t\r\n
	return (preg_match('~~u', $val) && !preg_match('~[\0-\x8\xB\xC\xE-\x1F]~', $val));
}

/** Format decimal number
* @param float|numeric-string $val
*/
function format_number($val) {
	return strtr(number_format($val, 0, ".", lang(4)), preg_split('~~u', lang(5), -1, PREG_SPLIT_NO_EMPTY));
}

/** Generate friendly URL */
function friendly_url($val) {
	// used for blobs and export
	return preg_replace('~\W~i', '-', $val);
}

/** Get status of a single table and fall back to name on error
* @return TableStatus one element from table_status()
*/
function table_status1($table, $fast = false) {
	$return = table_status($table, $fast);
	return ($return ? reset($return) : array("Name" => $table));
}

/** Find out foreign keys for each column
* @return list<ForeignKey>[] [$col => []]
*/
function column_foreign_keys($table) {
	$return = array();
	foreach (adminer()->foreignKeys($table) as $foreign_key) {
		foreach ($foreign_key["source"] as $val) {
			$return[$val][] = $foreign_key;
		}
	}
	return $return;
}

/** Compute fields() from $_POST edit data; used by Mongo and SimpleDB
* @return Field[] same as fields()
*/
function fields_from_edit() {
	$return = array();
	foreach ((array) $_POST["field_keys"] as $key => $val) {
		if ($val != "") {
			$val = bracket_escape($val);
			$_POST["function"][$val] = $_POST["field_funs"][$key];
			$_POST["fields"][$val] = $_POST["field_vals"][$key];
		}
	}
	foreach ((array) $_POST["fields"] as $key => $val) {
		$name = bracket_escape($key, true); // true - back
		$return[$name] = array(
			"field" => $name,
			"privileges" => array("insert" => 1, "update" => 1, "where" => 1, "order" => 1),
			"null" => 1,
			"auto_increment" => ($key == driver()->primary),
		);
	}
	return $return;
}

/** Send headers for export
* @return string extension
*/
function dump_headers($identifier, $multi_table = false) {
	$return = adminer()->dumpHeaders($identifier, $multi_table);
	$output = $_POST["output"];
	if ($output != "text") {
		header("Content-Disposition: attachment; filename=" . adminer()->dumpFilename($identifier) . ".$return" . ($output != "file" && preg_match('~^[0-9a-z]+$~', $output) ? ".$output" : ""));
	}
	session_write_close();
	if (!ob_get_level()) {
		ob_start(null, 4096);
	}
	ob_flush();
	flush();
	return $return;
}

/** Print CSV row
* @param string[] $row
*/
function dump_csv(array $row) {
	$tsv = $_POST["format"] == "tsv";
	foreach ($row as $key => $val) {
		if (preg_match('~["\n]|^0[^.]|\.\d*0$|' . ($tsv ? '\t' : '[,;]|^$') . '~', $val)) {
			$row[$key] = '"' . str_replace('"', '""', $val) . '"';
		}
	}
	echo implode(($_POST["format"] == "csv" ? "," : ($tsv ? "\t" : ";")), $row) . "\r\n";
}

/** Apply SQL function
* @param string $column escaped column identifier
*/
function apply_sql_function($function, $column) {
	return ($function ? ($function == "unixepoch" ? "DATETIME($column, '$function')" : ($function == "count distinct" ? "COUNT(DISTINCT " : strtoupper("$function(")) . "$column)") : $column);
}

/** Get path of the temporary directory */
function get_temp_dir() {
	$return = ini_get("upload_tmp_dir"); // session_save_path() may contain other storage path
	if (!$return) {
		if (function_exists('sys_get_temp_dir')) {
			$return = sys_get_temp_dir();
		} else {
			$filename = @tempnam("", ""); // @ - temp directory can be disabled by open_basedir
			if (!$filename) {
				return '';
			}
			$return = dirname($filename);
			unlink($filename);
		}
	}
	return $return;
}

/** Open and exclusively lock a file
* @return resource|void null for error
*/
function file_open_lock($filename) {
	if (is_link($filename)) {
		return; // https://cwe.mitre.org/data/definitions/61.html
	}
	$fp = @fopen($filename, "c+"); // @ - may not be writable
	if (!$fp) {
		return;
	}
	@chmod($filename, 0660); // @ - may not be permitted
	if (!flock($fp, LOCK_EX)) {
		fclose($fp);
		return;
	}
	return $fp;
}

/** Write and unlock a file
* @param resource $fp
*/
function file_write_unlock($fp, $data) {
	rewind($fp);
	fwrite($fp, $data);
	ftruncate($fp, strlen($data));
	file_unlock($fp);
}

/** Unlock and close a file
* @param resource $fp
*/
function file_unlock($fp) {
	flock($fp, LOCK_UN);
	fclose($fp);
}

/** Get first element of an array
* @param mixed[] $array
* @return mixed if not found
*/
function first(array $array) {
	// reset(f()) triggers a notice
	return reset($array);
}

/** Read password from file adminer.key in temporary directory or create one
* @return string '' if the file can not be created
*/
function password_file($create) {
	$filename = get_temp_dir() . "/adminer.key";
	if (!$create && !file_exists($filename)) {
		return '';
	}
	$fp = file_open_lock($filename);
	if (!$fp) {
		return '';
	}
	$return = stream_get_contents($fp);
	if (!$return) {
		$return = rand_string();
		file_write_unlock($fp, $return);
	} else {
		file_unlock($fp);
	}
	return $return;
}

/** Get a random string
* @return string 32 hexadecimal characters
*/
function rand_string() {
	return md5(uniqid(strval(mt_rand()), true));
}

/** Format value to use in select
* @param string|string[]|list<string[]> $val
* @param array{type: string} $field
* @param ?numeric-string $text_length
* @return string HTML
*/
function select_value($val, $link, array $field, $text_length) {
	if (is_array($val)) {
		$return = "";
		if (array_filter($val, 'is_array') == array_values($val)) { // list of arrays
			$keys = array();
			foreach ($val as $v) {
				$keys += array_fill_keys(array_keys($v), null);
			}
			foreach (array_keys($keys) as $k) {
				$return .= "<th>" . h($k);
			}
			foreach ($val as $v) {
				$return .= "<tr>";
				foreach (array_merge($keys, $v) as $v2) {
					$return .= "<td>" . select_value($v2, $link, $field, $text_length);
				}
			}
		} else {
			foreach ($val as $k => $v) {
				$return .= "<tr>"
					. ($val != array_values($val) ? "<th>" . h($k) : "")
					. "<td>" . select_value($v, $link, $field, $text_length)
				;
			}
		}
		return "<table>$return</table>";
	}
	if (!$link) {
		$link = adminer()->selectLink($val, $field);
	}
	if ($link === null) {
		if (is_mail($val)) {
			$link = "mailto:$val";
		}
		if (is_url($val)) {
			$link = $val; // IE 11 and all modern browsers hide referrer
		}
	}
	$return = adminer()->editVal(driver()->value($val, $field), $field);
	if ($return !== null) {
		if (!is_utf8($return)) {
			$return = "\0"; // htmlspecialchars of binary data returns an empty string
		} elseif ($text_length != "" && is_shortable($field)) {
			$return = shorten_utf8($return, max(0, +$text_length)); // usage of LEFT() would reduce traffic but complicate query - expected average speedup: .001 s VS .01 s on local network
		} else {
			$return = h($return);
		}
	}
	return adminer()->selectVal($return, $link, $field, $val);
}

/** Check whether the field type is blob or equivalent
* @param array{type: string} $field
*/
function is_blob(array $field) {
	return preg_match('~blob|bytea|raw|file~', $field["type"]) && !in_array($field["type"], idx(driver()->structuredTypes(), lang(6), array()));
}

/** Check whether the string is e-mail address */
function is_mail($email) {
	$atom = '[-a-z0-9!#$%&\'*+/=?^_`{|}~]'; // characters of local-name
	$domain = '[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])'; // one domain component
	$pattern = "$atom+(\\.$atom+)*@($domain?\\.)+$domain";
	return is_string($email) && preg_match("(^$pattern(,\\s*$pattern)*\$)i", $email);
}

/** Check whether the string is URL address */
function is_url($string) {
	$domain = '[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])'; // one domain component //! IDN
	return preg_match("~^((https?):)?//($domain?\\.)+$domain(:\\d+)?(/.*)?(\\?.*)?(#.*)?\$~i", $string); //! restrict path, query and fragment characters
}

/** Check if field should be shortened
* @param array{type: string} $field
*/
function is_shortable(array $field) {
	return !preg_match('~' . number_type() . '|date|time|year~', $field["type"]);
}

/** Split server into host and (port or socket)
* @return array{0: string, 1: string}
*/
function host_port($server) {
	return (preg_match('~^(\[(.+)]|([^:]+)):([^:]+)$~', $server, $match) // [a:b] - IPv6
		? array($match[2] . $match[3], $match[4])
		: array($server, '')
	);
}

/** Get query to compute number of found rows
* @param list<string> $where
* @param list<string> $group
*/
function count_rows($table, array $where, $is_group, array $group) {
	$query = " FROM " . table($table) . ($where ? " WHERE " . implode(" AND ", $where) : "");
	return ($is_group && (JUSH == "sql" || count($group) == 1)
		? "SELECT COUNT(DISTINCT " . implode(", ", $group) . ")$query"
		: "SELECT COUNT(*)" . ($is_group ? " FROM (SELECT 1$query GROUP BY " . implode(", ", $group) . ") x" : $query)
	);
}

/** Run query which can be killed by AJAX call after timing out
* @return string[]
*/
function slow_query($query) {
	$db = adminer()->database();
	$timeout = adminer()->queryTimeout();
	$slow_query = driver()->slowQuery($query, $timeout);
	$connection2 = null;
	if (!$slow_query && support("kill")) {
		$connection2 = connect();
		if ($connection2 && ($db == "" || $connection2->select_db($db))) {
			$kill = get_val(connection_id(), 0, $connection2); // MySQL and MySQLi can use thread_id but it's not in PDO_MySQL
			echo script("const timeout = setTimeout(() => { ajax('" . js_escape(ME) . "script=kill', function () {}, 'kill=$kill&token=" . get_token() . "'); }, 1000 * $timeout);");
		}
	}
	ob_flush();
	flush();
	$return = @get_key_vals(($slow_query ?: $query), $connection2, false); // @ - may be killed
	if ($connection2) {
		echo script("clearTimeout(timeout);");
		ob_flush();
		flush();
	}
	return $return;
}

/** Generate BREACH resistant CSRF token */
function get_token() {
	$rand = rand(1, 1e6);
	return ($rand ^ $_SESSION["token"]) . ":$rand";
}

/** Verify if supplied CSRF token is valid */
function verify_token() {
	list($token, $rand) = explode(":", $_POST["token"]);
	return ($rand ^ $_SESSION["token"]) == $token;
}

/** Return <script> element */
function script($source, $trailing = "\n") {
	return "<script" . nonce() . ">$source</script>$trailing";
}

/** Return <script src> element */
function script_src($url, $defer = false) {
	return "<script src='" . h($url) . "'" . nonce() . ($defer ? " defer" : "") . "></script>\n";
}

/** Get a nonce="" attribute with CSP nonce */
function nonce() {
	return ' nonce="' . get_nonce() . '"';
}

/** Get <input type="hidden">
* @param string|int $value
* @return string HTML
*/
function input_hidden($name, $value = "") {
	return "<input type='hidden' name='" . h($name) . "' value='" . h($value) . "'>\n";
}

/** Get CSRF <input type="hidden" name="token">
* @return string HTML
*/
function input_token() {
	return input_hidden("token", get_token());
}

/** Get a target="_blank" attribute */
function target_blank() {
	return ' target="_blank" rel="noreferrer noopener"';
}

/** Escape for HTML */
function h($string) {
	return str_replace("\0", "&#0;", htmlspecialchars($string, ENT_QUOTES, 'utf-8'));
}

/** Convert \n to <br> */
function nl_br($string) {
	return str_replace("\n", "<br>", $string); // nl2br() uses XHTML before PHP 5.3
}

/** Generate HTML checkbox
* @param string|int $value
*/
function checkbox($name, $value, $checked, $label = "", $onclick = "", $class = "", $labelled_by = "") {
	$return = "<input type='checkbox' name='$name' value='" . h($value) . "'"
		. ($checked ? " checked" : "")
		. ($labelled_by ? " aria-labelledby='$labelled_by'" : "")
		. ">"
		. ($onclick ? script("qsl('input').onclick = function () { $onclick };", "") : "")
	;
	return ($label != "" || $class ? "<label" . ($class ? " class='$class'" : "") . ">$return" . h($label) . "</label>" : $return);
}

/** Generate list of HTML options
* @param string[]|string[][] $options array of strings or arrays (creates optgroup)
* @param mixed $selected
* @param bool $use_keys always use array keys for value="", otherwise only string keys are used
*/
function optionlist($options, $selected = null, $use_keys = false) {
	$return = "";
	foreach ($options as $k => $v) {
		$opts = array($k => $v);
		if (is_array($v)) {
			$return .= '<optgroup label="' . h($k) . '">';
			$opts = $v;
		}
		foreach ($opts as $key => $val) {
			$return .= '<option'
				. ($use_keys || is_string($key) ? ' value="' . h($key) . '"' : '')
				. ($selected !== null && ($use_keys || is_string($key) ? (string) $key : $val) === $selected ? ' selected' : '')
				. '>' . h($val)
			;
		}
		if (is_array($v)) {
			$return .= '</optgroup>';
		}
	}
	return $return;
}

/** Generate HTML <select>
* @param string[] $options
*/
function html_select($name, array $options, $value = "", $onchange = "", $labelled_by = "") {
	static $label = 0;
	$label_option = "";
	if (!$labelled_by && substr($options[""], 0, 1) == "(") {
		$label++;
		$labelled_by = "label-$label";
		$label_option = "<option value='' id='$labelled_by'>" . h($options[""]);
		unset($options[""]);
	}
	return "<select name='" . h($name) . "'"
		. ($labelled_by ? " aria-labelledby='$labelled_by'" : "")
		. ">" . $label_option . optionlist($options, $value) . "</select>"
		. ($onchange ? script("qsl('select').onchange = function () { $onchange };", "") : "")
	;
}

/** Generate HTML radio list
* @param string[] $options
*/
function html_radios($name, array $options, $value = "", $separator = "") {
	$return = "";
	foreach ($options as $key => $val) {
		$return .= "<label><input type='radio' name='" . h($name) . "' value='" . h($key) . "'" . ($key == $value ? " checked" : "") . ">" . h($val) . "</label>$separator";
	}
	return $return;
}

/** Get onclick confirmation */
function confirm($message = "", $selector = "qsl('input')") {
	return script("$selector.onclick = () => confirm('" . ($message ? js_escape($message) : lang(7)) . "');", "");
}

/** Print header for hidden fieldset (close by </div></fieldset>)
* @param bool $visible
*/
function print_fieldset($id, $legend, $visible = false) {
	echo "<fieldset><legend>";
	echo "<a href='#fieldset-$id'>$legend</a>";
	echo script("qsl('a').onclick = partial(toggle, 'fieldset-$id');", "");
	echo "</legend>";
	echo "<div id='fieldset-$id'" . ($visible ? "" : " class='hidden'") . ">\n";
}

/** Return class='active' if $bold is true */
function bold($bold, $class = "") {
	return ($bold ? " class='active $class'" : ($class ? " class='$class'" : ""));
}

/** Escape string for JavaScript apostrophes */
function js_escape($string) {
	return addcslashes($string, "\r\n'\\/"); // slash for <script>
}

/** Generate page number for pagination */
function pagination($page, $current) {
	return " " . ($page == $current
		? $page + 1
		: '<a href="' . h(remove_from_uri("page") . ($page ? "&page=$page" . ($_GET["next"] ? "&next=" . urlencode($_GET["next"]) : "") : "")) . '">' . ($page + 1) . "</a>"
	);
}

/** Print hidden fields
* @param mixed[] $process
* @param list<string> $ignore
*/
function hidden_fields(array $process, array $ignore = array(), $prefix = '') {
	$return = false;
	foreach ($process as $key => $val) {
		if (!in_array($key, $ignore)) {
			if (is_array($val)) {
				hidden_fields($val, array(), $key);
			} else {
				$return = true;
				echo input_hidden(($prefix ? $prefix . "[$key]" : $key), $val);
			}
		}
	}
	return $return;
}

/** Print hidden fields for GET forms */
function hidden_fields_get() {
	echo (sid() ? input_hidden(session_name(), session_id()) : '');
	echo (SERVER !== null ? input_hidden(DRIVER, SERVER) : "");
	echo input_hidden("username", $_GET["username"]);
}

/** Get <input type='file'> */
function file_input($input) {
	$max_file_uploads = "max_file_uploads";
	$max_file_uploads_value = ini_get($max_file_uploads);
	$upload_max_filesize = "upload_max_filesize";
	$upload_max_filesize_value = ini_get($upload_max_filesize);
	return (ini_bool("file_uploads")
		? $input . script("qsl('input[type=\"file\"]').onchange = partialArg(fileChange, "
				. "$max_file_uploads_value, '" . lang(8, "$max_file_uploads = $max_file_uploads_value") . "', " // ignore post_max_size because it is for all form fields together and bytes computing would be necessary
				. ini_bytes("upload_max_filesize") . ", '" . lang(8, "$upload_max_filesize = $upload_max_filesize_value") . "')")
		: lang(9)
	);
}

/** Print enum or set input field
* @param 'radio'|'checkbox' $type
* @param Field $field
* @param string|string[]|false|null $value false means original value
*/
function enum_input($type, $attrs, array $field, $value, $empty = "") {
	preg_match_all("~'((?:[^']|'')*)'~", $field["length"], $matches);
	$prefix = ($field["type"] == "enum" ? "val-" : "");
	$checked = (is_array($value) ? in_array("null", $value) : $value === null);
	$return = ($field["null"] && $prefix ? "<label><input type='$type'$attrs value='null'" . ($checked ? " checked" : "") . "><i>$empty</i></label>" : "");
	foreach ($matches[1] as $val) {
		$val = stripcslashes(str_replace("''", "'", $val));
		$checked = (is_array($value) ? in_array($prefix . $val, $value) : $value === $val);
		$return .= " <label><input type='$type'$attrs value='" . h($prefix . $val) . "'" . ($checked ? ' checked' : '') . '>' . h(adminer()->editVal($val, $field)) . '</label>';
	}
	return $return;
}

/** Print edit input field
* @param Field|RoutineField $field
* @param mixed $value
*/
function input(array $field, $value, $function, $autofocus = false) {
	$name = h(bracket_escape($field["field"]));
	echo "<td class='function'>";
	if (is_array($value) && !$function) {
		$function = "json";
	}
	$json = ($function == "json" || preg_match('~^jsonb?$~', $field["type"]));
	if ($json && $value != '' && (JUSH != "pgsql" || $field["type"] != "json")) {
		$value = json_encode(is_array($value) ? $value : json_decode($value), 128 | 64 | 256); // 128 - JSON_PRETTY_PRINT, 64 - JSON_UNESCAPED_SLASHES, 256 - JSON_UNESCAPED_UNICODE available since PHP 5.4
	}
	$reset = (JUSH == "mssql" && $field["auto_increment"]);
	if ($reset && !$_POST["save"]) {
		$function = null;
	}
	$functions = (isset($_GET["select"]) || $reset ? array("orig" => lang(10)) : array()) + adminer()->editFunctions($field);
	$enums = driver()->enumLength($field);
	if ($enums) {
		$field["type"] = "enum";
		$field["length"] = $enums;
	}
	$attrs = " name='fields[$name]" . ($field["type"] == "enum" || $field["type"] == "set" ? "[]" : "") . "'" . ($autofocus ? " autofocus" : "");
	echo driver()->unconvertFunction($field) . " ";
	$table = $_GET["edit"] ?: $_GET["select"];
	if ($field["type"] == "enum") {
		echo h($functions[""]) . "<td>" . adminer()->editInput($table, $field, $attrs, $value);
	} else {
		$has_function = (in_array($function, $functions) || isset($functions[$function]));
		echo (count($functions) > 1
			? "<select name='function[$name]'>" . optionlist($functions, $function === null || $has_function ? $function : "") . "</select>"
				. on_help("event.target.value.replace(/^SQL\$/, '')", 1)
				. script("qsl('select').onchange = functionChange;", "")
			: h(reset($functions))
		) . '<td>';
		$input = adminer()->editInput($table, $field, $attrs, $value); // usage in call is without a table
		if ($input != "") {
			echo $input;
		} elseif (preg_match('~bool~', $field["type"])) {
			echo "<input type='hidden'$attrs value='0'>"
				. "<input type='checkbox'" . (preg_match('~^(1|t|true|y|yes|on)$~i', $value) ? " checked='checked'" : "") . "$attrs value='1'>";
		} elseif ($field["type"] == "set") {
			echo enum_input("checkbox", $attrs, $field, (is_string($value) ? explode(",", $value) : $value));
		} elseif (is_blob($field) && ini_bool("file_uploads")) {
			echo "<input type='file' name='fields-$name'>";
		} elseif ($json) {
			echo "<textarea$attrs cols='50' rows='12' class='jush-js'>" . h($value) . '</textarea>';
		} elseif (($text = preg_match('~text|lob|memo~i', $field["type"])) || preg_match("~\n~", $value)) {
			if ($text && JUSH != "sqlite") {
				$attrs .= " cols='50' rows='12'";
			} else {
				$rows = min(12, substr_count($value, "\n") + 1);
				$attrs .= " cols='30' rows='$rows'";
			}
			echo "<textarea$attrs>" . h($value) . '</textarea>';
		} else {
			// int(3) is only a display hint
			$types = driver()->types();
			$maxlength = (!preg_match('~int~', $field["type"]) && preg_match('~^(\d+)(,(\d+))?$~', $field["length"], $match)
				? ((preg_match("~binary~", $field["type"]) ? 2 : 1) * $match[1] + ($match[3] ? 1 : 0) + ($match[2] && !$field["unsigned"] ? 1 : 0))
				: ($types[$field["type"]] ? $types[$field["type"]] + ($field["unsigned"] ? 0 : 1) : 0)
			);
			if (JUSH == 'sql' && min_version(5.6) && preg_match('~time~', $field["type"])) {
				$maxlength += 7; // microtime
			}
			// type='date' and type='time' display localized value which may be confusing, type='datetime' uses 'T' as date and time separator
			echo "<input"
				. ((!$has_function || $function === "") && preg_match('~(?<!o)int(?!er)~', $field["type"]) && !preg_match('~\[\]~', $field["full_type"]) ? " type='number'" : "")
				. " value='" . h($value) . "'" . ($maxlength ? " data-maxlength='$maxlength'" : "")
				. (preg_match('~char|binary~', $field["type"]) && $maxlength > 20 ? " size='" . ($maxlength > 99 ? 60 : 40) . "'" : "")
				. "$attrs>"
			;
		}
		echo adminer()->editHint($table, $field, $value);
		// skip 'original'
		$first = 0;
		foreach ($functions as $key => $val) {
			if ($key === "" || !$val) {
				break;
			}
			$first++;
		}
		if ($first && count($functions) > 1) {
			echo script("qsl('td').oninput = partial(skipOriginal, $first);");
		}
	}
}

/** Process edit input field
* @param Field|RoutineField $field
* @return mixed false to leave the original value
*/
function process_input(array $field) {
	$idf = bracket_escape($field["field"]);
	$function = idx($_POST["function"], $idf);
	$value = idx($_POST["fields"], $idf);
	if ($value === null) {
		return false;
	}
	if ($field["type"] == "enum" || driver()->enumLength($field)) {
		$value = idx($value, 0);
		if ($value == "orig" || !$value) {
			return false;
		}
		if ($value == "null") {
			return "NULL";
		}
		$value = substr($value, 4); // 4 - strlen("val-")
	}
	if ($field["auto_increment"] && $value == "") {
		return null;
	}
	if ($function == "orig") {
		return (preg_match('~^CURRENT_TIMESTAMP~i', $field["on_update"]) ? idf_escape($field["field"]) : false);
	}
	if ($function == "NULL") {
		return "NULL";
	}
	if ($field["type"] == "set") {
		$value = implode(",", (array) $value);
	}
	if ($function == "json") {
		$function = "";
		$value = json_decode($value, true);
		if (!is_array($value)) {
			return false; //! report errors
		}
		return $value;
	}
	if (is_blob($field) && ini_bool("file_uploads")) {
		$file = get_file("fields-$idf");
		if (!is_string($file)) {
			return false; //! report errors
		}
		return driver()->quoteBinary($file);
	}
	return adminer()->processInput($field, $value, $function);
}

/** Print results of search in all tables
* @uses $_GET["where"][0]
* @uses $_POST["tables"]
*/
function search_tables() {
	$_GET["where"][0]["val"] = $_POST["query"];
	$sep = "<ul>\n";
	foreach (table_status('', true) as $table => $table_status) {
		$name = adminer()->tableName($table_status);
		if (isset($table_status["Engine"]) && $name != "" && (!$_POST["tables"] || in_array($table, $_POST["tables"]))) {
			$result = connection()->query("SELECT" . limit("1 FROM " . table($table), " WHERE " . implode(" AND ", adminer()->selectSearchProcess(fields($table), array())), 1));
			if (!$result || $result->fetch_row()) {
				$print = "<a href='" . h(ME . "select=" . urlencode($table) . "&where[0][op]=" . urlencode($_GET["where"][0]["op"]) . "&where[0][val]=" . urlencode($_GET["where"][0]["val"])) . "'>$name</a>";
				echo "$sep<li>" . ($result ? $print : "<p class='error'>$print: " . error()) . "\n";
				$sep = "";
			}
		}
	}
	echo ($sep ? "<p class='message'>" . lang(11) : "</ul>") . "\n";
}

/** Return events to display help on mouse over
* @param string $command JS expression
* @param int $side 0 top, 1 left
*/
function on_help($command, $side = 0) {
	return script("mixin(qsl('select, input'), {onmouseover: function (event) { helpMouseover.call(this, event, $command, $side) }, onmouseout: helpMouseout});", "");
}

/** Print edit data form
* @param Field[] $fields
* @param mixed $row
*/
function edit_form($table, array $fields, $row, $update, $error = '') {
	$table_name = adminer()->tableName(table_status1($table, true));
	page_header(
		($update ? lang(12) : lang(13)),
		$error,
		array("select" => array($table, $table_name)),
		$table_name
	);
	adminer()->editRowPrint($table, $fields, $row, $update);
	if ($row === false) {
		echo "<p class='error'>" . lang(14) . "\n";
		return;
	}
	echo "<form action='' method='post' enctype='multipart/form-data' id='form'>\n";
	$editable = false;
	if (!$fields) {
		echo "<p class='error'>" . lang(15) . "\n";
	} else {
		echo "<table class='layout'>" . script("qsl('table').onkeydown = editingKeydown;");
		$autofocus = !$_POST;
		foreach ($fields as $name => $field) {
			echo "<tr><th>" . adminer()->fieldName($field);
			$default = idx($_GET["set"], bracket_escape($name));
			if ($default === null) {
				$default = $field["default"];
				if ($field["type"] == "bit" && preg_match("~^b'([01]*)'\$~", $default, $regs)) {
					$default = $regs[1];
				}
				if (JUSH == "sql" && preg_match('~binary~', $field["type"])) {
					$default = bin2hex($default); // same as UNHEX
				}
			}
			$value = ($row !== null
				? ($row[$name] != "" && JUSH == "sql" && preg_match("~enum|set~", $field["type"]) && is_array($row[$name])
					? implode(",", $row[$name])
					: (is_bool($row[$name]) ? +$row[$name] : $row[$name])
				)
				: (!$update && $field["auto_increment"]
					? ""
					: (isset($_GET["select"]) ? false : $default)
				)
			);
			if (!$_POST["save"] && is_string($value)) {
				$value = adminer()->editVal($value, $field);
			}
			if (($update && !isset($field["privileges"]["update"])) || $field["generated"]) {
				echo "<td class='function'><td>" . select_value($value, '', $field, null);
			} else {
				$editable = true;
				$function = ($_POST["save"]
					? idx($_POST["function"], $name, "")
					: ($update && preg_match('~^CURRENT_TIMESTAMP~i', $field["on_update"])
						? "now"
						: ($value === false ? null : ($value !== null ? '' : 'NULL'))
					)
				);
				if (!$_POST && !$update && $value == $field["default"] && preg_match('~^[\w.]+\(~', $value)) {
					$function = "SQL";
				}
				if (preg_match("~time~", $field["type"]) && preg_match('~^CURRENT_TIMESTAMP~i', $value)) {
					$value = "";
					$function = "now";
				}
				if ($field["type"] == "uuid" && $value == "uuid()") {
					$value = "";
					$function = "uuid";
				}
				if ($autofocus !== false) {
					$autofocus = ($field["auto_increment"] || $function == "now" || $function == "uuid" ? null : true); // null - don't autofocus this input but check the next one
				}
				input($field, $value, $function, $autofocus);
				if ($autofocus) {
					$autofocus = false;
				}
			}
			echo "\n";
		}
		if (!support("table") && !fields($table)) {
			echo "<tr>"
				. "<th><input name='field_keys[]'>"
				. script("qsl('input').oninput = fieldChange;")
				. "<td class='function'>" . html_select("field_funs[]", adminer()->editFunctions(array("null" => isset($_GET["select"]))))
				. "<td><input name='field_vals[]'>"
				. "\n"
			;
		}
		echo "</table>\n";
	}
	echo "<p>\n";
	if ($editable) {
		echo "<input type='submit' value='" . lang(16) . "'>\n";
		if (!isset($_GET["select"])) {
			echo "<input type='submit' name='insert' value='" . ($update
				? lang(17)
				: lang(18)
			) . "' title='Ctrl+Shift+Enter'>\n";
			echo ($update ? script("qsl('input').onclick = function () { return !ajaxForm(this.form, '" . lang(19) . "…', this); };") : "");
		}
	}
	echo ($update ? "<input type='submit' name='delete' value='" . lang(20) . "'>" . confirm() . "\n" : "");
	if (isset($_GET["select"])) {
		hidden_fields(array("check" => (array) $_POST["check"], "clone" => $_POST["clone"], "all" => $_POST["all"]));
	}
	echo input_hidden("referer", (isset($_POST["referer"]) ? $_POST["referer"] : $_SERVER["HTTP_REFERER"]));
	echo input_hidden("save", 1);
	echo input_token();
	echo "</form>\n";
}

/** Shorten UTF-8 string
* @return string escaped string with appended ...
*/
function shorten_utf8($string, $length = 80, $suffix = "") {
	if (!preg_match("(^(" . repeat_pattern("[\t\r\n -\x{10FFFF}]", $length) . ")($)?)u", $string, $match)) { // ~s causes trash in $match[2] under some PHP versions, (.|\n) is slow
		preg_match("(^(" . repeat_pattern("[\t\r\n -~]", $length) . ")($)?)", $string, $match);
	}
	return h($match[1]) . $suffix . (isset($match[2]) ? "" : "<i>…</i>");
}

/** Get button with icon */
function icon($icon, $name, $html, $title) {
	return "<button type='submit' name='$name' title='" . h($title) . "' class='icon icon-$icon'><span>$html</span></button>";
}


// used only in compiled file
if (isset($_GET["file"])) {
	
if (substr(VERSION, -4) != '-dev') {
	if ($_SERVER["HTTP_IF_MODIFIED_SINCE"]) {
		header("HTTP/1.1 304 Not Modified");
		exit;
	}
	header("Expires: " . gmdate("D, d M Y H:i:s", time() + 365*24*60*60) . " GMT");
	header("Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT");
	header("Cache-Control: immutable");
}

if ($_GET["file"] == "default.css") {
	header("Content-Type: text/css; charset=utf-8");
	echo "/** @author Ondrej Valka, http://valka.info */\n\nhtml {\n\t--bg: #fff;\n\t--fg: #000;\n\t--dim: #eee;\n\t--lit: #ddf;\n}\n\nbody { color: var(--fg); background: var(--bg); font: 90%/1.25 Verdana, Arial, Helvetica, sans-serif; margin: 0; min-width: fit-content; }\na { color: blue; text-decoration: none; }\na:visited { color: navy; }\na:link:hover, a:visited:hover { color: red; text-decoration: underline; }\na.text:hover { text-decoration: none; }\na.jush-help:hover { color: inherit; }\nh1 { font-size: 150%; margin: 0; padding: .8em .667em; border-bottom: 1px solid #999; font-weight: normal; color: #777; background: var(--dim); }\nh2 { font-size: 150%; margin: 0 0 20px -18px; padding: .8em 1em; border-bottom: 1px solid var(--fg); font-weight: normal; background: var(--lit); }\nh3 { font-weight: normal; font-size: 130%; margin: 1em 0 0; }\nform { margin: 0; }\ntd table { width: 100%; margin: 0; }\ntable { margin: 1em 20px 0 0; font-size: 90%; border-spacing: 0; border-width: 1px 0 0 1px; }\ntable, td, th, .js .column { border-color: #999; border-style: solid; }\ntd, th { border-width: 0 1px 1px 0; padding: .2em .3em; margin: 0; }\nth { background: var(--dim); text-align: left; }\nthead { position: sticky; top: 0; }\nthead th { text-align: center; padding: .2em .5em; }\nthead td, thead th { background: var(--lit); }\nfieldset { display: inline; vertical-align: top; padding: .5em .8em; margin: .8em .5em 0 0; border: 1px solid #999; border-radius: 5px; }\np { margin: .8em 20px 0 0; }\nimg { vertical-align: middle; border: 0; }\ntd img { max-width: 200px; max-height: 200px; }\ntbody tr:hover td, tbody tr:hover th { background: var(--dim); }\ncode { font-size: 110%; padding: 1px 2px; background: var(--dim); }\npre { margin: 1em 0 0; }\ntd pre { margin: 0; }\npre, textarea { font: 110%/1.25 monospace; }\npre.jush { background: var(--bg); }\npre code { display: block; font-size: 100%; }\ninput, textarea { box-sizing: border-box; }\ninput, select { vertical-align: middle; }\ninput[type=\"radio\"] { vertical-align: text-bottom; }\ninput.default { box-shadow: 1px 1px 1px #777; }\ninput.required, input.maxlength { box-shadow: 1px 1px 1px red; }\ninput.wayoff { left: -1000px; position: absolute; }\n.block { display: block; }\n.version { color: #777; font-size: 62%; }\n.js .hidden, .nojs .jsonly { display: none; }\n.js .column { position: absolute; background: var(--lit); padding: .27em 1ex .33em 0; margin-top: -.37em; border-width: 1px 1px 1px 0; border-radius: 0 8px 8px 0; }\n.nowrap td, .nowrap th, td.nowrap, p.nowrap { white-space: pre; }\n.wrap td { white-space: normal; }\n.error { color: red; background: #fee; }\n.error b { background: var(--bg); font-weight: normal; }\n.message { color: green; background: #efe; }\n.message table { color: var(--fg); background: var(--bg); }\n.error, .message { padding: .5em .8em; margin: 1em 20px 0 0; }\n.char { color: #007F00; }\n.date { color: #7F007F; }\n.enum { color: #007F7F; }\n.binary { color: red; }\n.odds tbody tr { background: var(--bg); }\n.odds tbody tr:nth-child(2n) { background: #F5F5F5; }\n.js .checkable .checked td, .js .checkable .checked th { background: var(--lit); }\n.time { color: silver; font-size: 70%; }\n.function, .number, .datetime { text-align: right; }\n.type { width: 15ex; }\n.options select, .options input { width: 20ex; }\n.view { font-style: italic; }\n.active { font-weight: bold; }\n.sqlarea { width: 98%; }\n.sql-footer { margin-bottom: 2.5em; }\n.explain table { white-space: pre; }\n.icon { width: 18px; height: 18px; background: navy center no-repeat; border: 0; padding: 0; vertical-align: middle; }\n.icon span { display: none; }\n.icon:hover { background-color: red; }\n.size { width: 7ex; }\n.help { cursor: help; }\n.footer { position: sticky; bottom: 0; margin: 23px -20px .5em 0; box-shadow: 0 -5px 10px 10px var(--bg); }\n.footer > div { background: var(--bg); padding: 0 0 .5em; }\n.footer fieldset { margin-top: 0; }\n.links a { white-space: nowrap; margin-right: 20px; }\n.logout { margin-top: .5em; position: absolute; top: 0; right: 0; background-color: var(--bg); box-shadow: 0 0 5px 5px var(--bg); }\n.loadmore { margin-left: 1ex; }\n/* .edit used in designs */\n#menu { position: absolute; margin: 10px 0 0; top: 2em; left: 0; width: 19em; }\n#menu p, #logins, #tables { padding: .8em 1em; margin: 0; border-bottom: 1px solid #ccc; }\n#logins li, #tables li { list-style: none; }\n#dbs { overflow: hidden; }\n#logins, #tables { white-space: nowrap; overflow: hidden; }\n#logins a, #tables a, #tables span { background: var(--bg); }\n#content { margin: 2em 0 0 21em; padding: 10px 20px 20px 0; }\n#lang { position: absolute; top: -2.6em; left: 0; padding: .3em 1em; }\n#menuopen { display: none; }\n#breadcrumb { white-space: nowrap; position: absolute; top: 0; left: 21em; background: var(--dim); height: 2em; line-height: 1.8em; padding: 0 1em; margin: 0 0 0 -18px; }\n#logo { vertical-align: baseline; margin-bottom: -3px; }\n#h1 { color: #777; text-decoration: none; font-style: italic; }\n#version { color: red; }\n#schema { margin-left: 60px; position: relative; user-select: none; -webkit-user-select: none; }\n#schema .table { border: 1px solid silver; padding: 0 2px; cursor: move; position: absolute; }\n#schema .references { position: absolute; }\n#help { position: absolute; border: 1px solid #999; background: var(--dim); padding: 5px; font-family: monospace; z-index: 1; }\n:target { background: var(--lit); }\n\n/* inlined here and not in compile.php because otherwise the development version flickers a little bit when loading the images */\n.icon-up { background-image: url(data:image/gif;base64,R0lGODlhEgASAIEAMe7u7gAAgJmZmQAAACH5BAEAAAEALAAAAAASABIAAQIghI+py+0PTQhRTgrvfRP0nmEVOIoReZphxbauAMfyHBcAOw==); }\n.icon-down { background-image: url(data:image/gif;base64,R0lGODlhEgASAIEAMe7u7gAAgJmZmQAAACH5BAEAAAEALAAAAAASABIAAQIghI+py+0PTQjxzCopvltX/lyix0wm2ZwdxraVAMfyHBcAOw==); }\n.icon-plus { background-image: url(data:image/gif;base64,R0lGODlhEgASAIEAMe7u7gAAgJmZmQAAACH5BAEAAAEALAAAAAASABIAAQIhhI+py+0PTQjxzCopvm/6rykgCHGVGaFliLXuI8TyTMsFADs=); }\n.icon-cross { background-image: url(data:image/gif;base64,R0lGODlhEgASAIEAMe7u7gAAgJmZmQAAACH5BAEAAAEALAAAAAASABIAAQIjhI+py+0PIwph1kZvfnnDLoFfd2GU4THnsUruC0fCTNc2XQAAOw==); }\n.icon-move { background-image: url(data:image/gif;base64,R0lGODlhEgASAJEAAO7u7gAAAJmZmQAAACH5BAEAAAEALAAAAAASABIAAAIfhI+py+3vgpyU0Rug3gnX5U3cqIWSZZLqigjuC8dvAQA7); }\n#schema .arrow { height: 1.25em; background: url(data:image/gif;base64,R0lGODlhCAAKAIAAAICAgP///yH5BAEAAAEALAAAAAAIAAoAAAIPBIJplrGLnpQRqtOy3rsAADs=) no-repeat right center; }\n\n.rtl h2 { margin: 0 -18px 20px 0; }\n.rtl p, .rtl table, .rtl .error, .rtl .message { margin: 1em 0 0 20px; }\n.rtl .logout { left: 0; right: auto; }\n.rtl #content { margin: 2em 21em 0 0; padding: 10px 0 20px 20px; }\n.rtl #breadcrumb { left: auto; right: 21em; margin: 0 -18px 0 0; }\n.rtl .pages { left: auto; right: 21em; }\n.rtl input.wayoff { left: auto; right: -1000px; }\n.rtl #lang, .rtl #menu { left: auto; right: 0; }\n.rtl pre, .rtl code { direction: ltr; }\n\n@media all and (max-width: 800px) {\n\t.pages { left: auto; }\n\t.js .logout { top: 1.667em; background-color: var(--dim); box-shadow: 0 0 5px 5px var(--dim); }\n\t#menu { position: static; width: auto; min-width: 23em; background: var(--bg); border: 1px solid var(--fg); margin-top: 9px; box-shadow: 0 0 20px -3px var(--fg); }\n\t#content { margin-left: 10px !important; }\n\t#lang { position: static; }\n\t#breadcrumb { left: 48px !important; }\n\t.js #foot { position: absolute; top: 2em; left: 0; }\n\t.js .foot { display: none; }\n\t.js #menuopen { display: block; position: absolute; top: 3px; left: 6px; }\n\t.nojs #menu { position: static; }\n\t.rtl.js #foot { left: auto; right: 0; }\n\t.rtl .pages { right: auto; }\n\t.rtl.js #menuopen { left: auto; right: 6px; }\n\t.rtl #content { margin-left: 0 !important; margin-right: 10px; }\n\t.rtl #breadcrumb { left: auto !important; right: 48px; }\n}\n\n@media print {\n\t#lang, #menu, .logout { display: none; }\n\t#content { margin-left: 1em; }\n\t#breadcrumb { left: 1em; }\n\t.rtl #content { margin-left: auto; margin-right: 1em; }\n\t.rtl #breadcrumb { left: auto; right: 1em; }\n\t.nowrap td, .nowrap th, td.nowrap { white-space: normal; }\n}\n.jush {\n\t--text-color: #000;\n\t--bg-color: #fff;\n\t--php-color: #003;\n\t--string-color: green;\n\t--string-plain-color: #009F00;\n\t--keyword-color: navy;\n\t--identifier-color: red;\n\t--value-color: purple;\n\t--number-color: #007F7F;\n\t--attribute-color: teal;\n\t--js-bg-color: #f0f0ff;\n\t--css-bg-color: #ffffe0;\n\t--php-bg-color: #fff0f0;\n\t--php-sql-bg-color: #ffbbb0;\n}\n\n.jush { color: var(--text-color); white-space: pre; }\n.jush-htm_com, .jush-com, .jush-com_code, .jush-one, .jush-php_doc, .jush-php_com, .jush-php_one, .jush-js_one, .jush-js_doc { color: gray; }\n.jush-php, .jush-php_new, .jush-php_fun { color: var(--php-color); background-color: var(--php-bg-color); }\n.jush-php_quo, .jush-php_eot, .jush-js_bac { color: var(--string-color); }\n.jush-php_apo, .jush-quo, .jush-quo_one, .jush-apo, .jush-sql_apo, .jush-sqlite_apo, .jush-sql_quo, .jush-sql_eot { color: var(--string-plain-color); }\n.jush-php_quo_var, .jush-php_var, .jush-sql_var, .jush-js_bac .jush-js { font-style: italic; }\n.jush-php_apo .jush-php_quo_var, .jush-php_apo .jush-php_var { font-style: normal; }\n.jush-php_halt2 { background-color: var(--bg-color); color: var(--text-color); }\n.jush-tag_css, .jush-att_css .jush-att_quo, .jush-att_css .jush-att_apo, .jush-att_css .jush-att_val { color: var(--text-color); background-color: var(--css-bg-color); }\n.jush-tag_js, .jush-att_js .jush-att_quo, .jush-att_js .jush-att_apo, .jush-att_js .jush-att_val, .jush-css_js { color: var(--text-color); background-color: var(--js-bg-color); }\n.jush-tag, .jush-xml_tag { color: var(--keyword-color); }\n.jush-att, .jush-xml_att, .jush-att_js, .jush-att_css, .jush-att_http { color: var(--attribute-color); }\n.jush-att_quo, .jush-att_apo, .jush-att_val { color: var(--value-color); }\n.jush-ent { color: var(--value-color); }\n.jush-js_key, .jush-js_key .jush-quo, .jush-js_key .jush-apo { color: var(--value-color); }\n.jush-js_reg { color: var(--keyword-color); }\n.jush-php_sql .jush-php_quo, .jush-php_sql .jush-php_apo,\n.jush-php_sqlite .jush-php_quo, .jush-php_sqlite .jush-php_apo,\n.jush-php_pgsql .jush-php_quo, .jush-php_pgsql .jush-php_apo,\n.jush-php_mssql .jush-php_quo, .jush-php_mssql .jush-php_apo,\n.jush-php_oracle .jush-php_quo, .jush-php_oracle .jush-php_apo { background-color: var(--php-sql-bg-color); }\n.jush-bac, .jush-php_bac, .jush-bra, .jush-mssql_bra, .jush-sqlite_quo { color: var(--identifier-color); }\n.jush-num, .jush-clr { color: var(--number-color); }\n\n.jush a { color: var(--keyword-color); }\n.jush a.jush-help { cursor: help; }\n.jush-sql a, .jush-sql_code a, .jush-sqlite a, .jush-pgsql a, .jush-mssql a, .jush-oracle a, .jush-simpledb a, .jush-igdb a { font-weight: bold; }\n.jush-php_sql .jush-php_quo a, .jush-php_sql .jush-php_apo a { font-weight: normal; }\n.jush-tag a, .jush-att a, .jush-apo a, .jush-quo a, .jush-php_apo a, .jush-php_quo a, .jush-php_eot2 a { color: inherit; }\na.jush-custom:link, a.jush-custom:visited { font-weight: normal; color: inherit; }\n\n.jush p { margin: 0; }\n";
} elseif ($_GET["file"] == "dark.css") {
	header("Content-Type: text/css; charset=utf-8");
	echo "/** @author Robert Mesaros, https://www.rmsoft.sk */\n\nhtml {\n\t--bg: #002240;\n\t--fg: #829bb0;\n\t--dim: #154269;\n\t--lit: #011d35;\n}\n\na, a:visited { color: #618cb3; }\na:link:hover, a:visited:hover { color: #9bc0e1; }\nh1 { border-color: #5e94c1; color: #ffddbf; }\nh2 { border-color: #a3bdd3; color: #000; background: #3c678d; }\ntable, td, th, .js .column { border-color: #0e416d; }\nth { background: #11385a; }\nthead td, thead th, thead th a { color: #a8b05f; }\nfieldset { border-color: #16548a; }\ncode { background: #11385a; }\ntbody tr:hover td, tbody tr:hover th { background: #133553; }\npre.jush { background: #11385a; }\ninput.default { box-shadow: 1px 1px 1px #888; }\ninput.required, input.maxlength { box-shadow: 1px 1px 1px red; }\n.version { color: #888; }\n.error { color: red; background: #efdada; border: 1px solid #e76f6f; }\n.error b { background: #efeaea; }\n.message { color: #0b860b; background: #efe; border: 1px solid #7fbd7f; }\n.char { color: #a949a9; }\n.date { color: #59c159; }\n.enum { color: #d55c5c; }\n.binary { color: #9bc0e1; }\n.odds tbody tr:nth-child(2n) { background: #042541; }\n.js .checkable .checked td, .js .checkable .checked th { background: #10395c; color: #67a4a5; }\n.js .checkable .checked:hover td, .js .checkable .checked:hover th { background: #133553; }\n.js .checkable .checked a { color: #67a4a5; }\n.icon { filter: invert(1); background-color: #062642; }\n.icon:hover { background-color: #d1394e; }\n#menu { border-color: #a3bdd3; }\n#menu p, #logins, #tables { border-color: #326b9c; }\n#h1 { color: #ffddbf; }\n#version { color: #d2b397; }\n#schema .table { border-color: #093459; }\n#help { border-color: #666; background: #c7e4fe; }\n#schema div.table a { color: #3c7bb3; }\n#menu .active { color: #398c8d; }\n#edit-fields tbody tr:hover td, #edit-fields tbody tr:hover th { background: #3b6f9d; }\n:target { color: #a8b05f; }\n.jush {\n\t--text-color: #ccc;\n\t--bg-color: #111;\n\t--php-color: #cc9;\n\t--string-color: #e6e;\n\t--string-plain-color: #e6e;\n\t--keyword-color: #acf;\n\t--identifier-color: #f88;\n\t--value-color: #e6e;\n\t--number-color: #0c0;\n\t--attribute-color: #3cc;\n\t--js-bg-color: #036;\n\t--css-bg-color: #404000;\n\t--php-bg-color: #520;\n\t--php-sql-bg-color: #404000;\n}\n";
} elseif ($_GET["file"] == "functions.js") {
	header("Content-Type: text/javascript; charset=utf-8");
	echo "'use strict';\n\n/** Get first element by selector\n* @param string\n* @param [HTMLElement] defaults to document\n* @return HTMLElement\n*/\nfunction qs(selector, context) {\n\treturn (context || document).querySelector(selector);\n}\n\n/** Get last element by selector\n* @param string\n* @param [HTMLElement] defaults to document\n* @return HTMLElement\n*/\nfunction qsl(selector, context) {\n\tconst els = qsa(selector, context);\n\treturn els[els.length - 1];\n}\n\n/** Get all elements by selector\n* @param string\n* @param [HTMLElement] defaults to document\n* @return NodeList\n*/\nfunction qsa(selector, context) {\n\treturn (context || document).querySelectorAll(selector);\n}\n\n/** Return a function calling fn with the next arguments\n* @param function\n* @param ...\n* @return function with preserved this\n*/\nfunction partial(fn) {\n\tconst args = Array.apply(null, arguments).slice(1);\n\treturn function () {\n\t\treturn fn.apply(this, args);\n\t};\n}\n\n/** Return a function calling fn with the first parameter and then the next arguments\n* @param function\n* @param ...\n* @return function with preserved this\n*/\nfunction partialArg(fn) {\n\tconst args = Array.apply(null, arguments);\n\treturn function (arg) {\n\t\targs[0] = arg;\n\t\treturn fn.apply(this, args);\n\t};\n}\n\n/** Assign values from source to target\n* @param Object\n* @param Object\n*/\nfunction mixin(target, source) {\n\tfor (const key in source) {\n\t\ttarget[key] = source[key];\n\t}\n}\n\n/** Add or remove CSS class\n* @param HTMLElement\n* @param string\n* @param [boolean]\n*/\nfunction alterClass(el, className, enable) {\n\tif (el) {\n\t\tel.classList[enable ? 'add' : 'remove'](className);\n\t}\n}\n\n/** Toggle visibility\n* @param string\n* @return boolean false\n*/\nfunction toggle(id) {\n\tconst el = qs('#' + id);\n\tel && el.classList.toggle('hidden');\n\treturn false;\n}\n\n/** Set permanent cookie\n* @param string\n* @param number\n*/\nfunction cookie(assign, days) {\n\tconst date = new Date();\n\tdate.setDate(date.getDate() + days);\n\tdocument.cookie = assign + '; expires=' + date;\n}\n\n/** Verify current Adminer version\n* @param string\n*/\nfunction verifyVersion(current) {\n\tcookie('adminer_version=0', 1);\n\t// do not send X-Requested-With to avoid preflight\n\tfetch('https://www.adminer.org/version/?current=' + current).then(async response => {\n\t\tconst json = await response.json();\n\t\tcookie('adminer_version=' + (json.version || current), 7); // empty if there's no newer version\n\t\tqs('#version').textContent = json.version;\n\t});\n}\n\n/** Get value of select\n* @param HTMLElement <select> or <input>\n* @return string\n*/\nfunction selectValue(select) {\n\tif (!select.selectedIndex) {\n\t\treturn select.value;\n\t}\n\tconst selected = select.options[select.selectedIndex];\n\treturn ((selected.attributes.value || {}).specified ? selected.value : selected.text);\n}\n\n/** Verify if element has a specified tag name\n* @param HTMLElement\n* @param string regular expression\n* @return boolean\n*/\nfunction isTag(el, tag) {\n\tconst re = new RegExp('^(' + tag + ')\$', 'i');\n\treturn el && re.test(el.tagName);\n}\n\n/** Get parent node with specified tag name\n* @param HTMLElement\n* @param string regular expression\n* @return HTMLElement\n*/\nfunction parentTag(el, tag) {\n\twhile (el && !isTag(el, tag)) {\n\t\tel = el.parentNode;\n\t}\n\treturn el;\n}\n\n/** Set checked class\n* @param HTMLInputElement\n*/\nfunction trCheck(el) {\n\tconst tr = parentTag(el, 'tr');\n\talterClass(tr, 'checked', el.checked);\n\tif (el.form && el.form['all'] && el.form['all'].onclick) { // Opera treats form.all as document.all\n\t\tel.form['all'].onclick();\n\t}\n}\n\n/** Fill number of selected items\n* @param string\n* @param string\n* @uses thousandsSeparator\n*/\nfunction selectCount(id, count) {\n\tsetHtml(id, (count === '' ? '' : '(' + (count + '').replace(/\\B(?=(\\d{3})+\$)/g, thousandsSeparator) + ')'));\n\tconst el = qs('#' + id);\n\tif (el) {\n\t\tfor (const input of qsa('input', el.parentNode.parentNode)) {\n\t\t\tif (input.type == 'submit') {\n\t\t\t\tinput.disabled = (count == '0');\n\t\t\t}\n\t\t}\n\t}\n}\n\n/** Check all elements matching given name\n* @param RegExp\n* @this HTMLInputElement\n*/\nfunction formCheck(name) {\n\tfor (const elem of this.form.elements) {\n\t\tif (name.test(elem.name)) {\n\t\t\telem.checked = this.checked;\n\t\t\ttrCheck(elem);\n\t\t}\n\t}\n}\n\n/** Check all rows in <table class=\"checkable\">\n*/\nfunction tableCheck() {\n\tfor (const input of qsa('table.checkable td:first-child input')) {\n\t\ttrCheck(input);\n\t}\n}\n\n/** Uncheck single element\n* @param string\n*/\nfunction formUncheck(id) {\n\tconst el = qs('#' + id);\n\tel.checked = false;\n\ttrCheck(el);\n}\n\n/** Get number of checked elements matching given name\n* @param HTMLInputElement\n* @param RegExp\n* @return number\n*/\nfunction formChecked(input, name) {\n\tlet checked = 0;\n\tfor (const el of input.form.elements) {\n\t\tif (name.test(el.name) && el.checked) {\n\t\t\tchecked++;\n\t\t}\n\t}\n\treturn checked;\n}\n\n/** Select clicked row\n* @param MouseEvent\n* @param [boolean] force click\n*/\nfunction tableClick(event, click) {\n\tconst td = parentTag(event.target, 'td');\n\tlet text;\n\tif (td && (text = td.dataset.text)) {\n\t\tif (selectClick.call(td, event, +text, td.dataset.warning)) {\n\t\t\treturn;\n\t\t}\n\t}\n\tclick = (click || !window.getSelection || getSelection().isCollapsed);\n\tlet el = event.target;\n\twhile (!isTag(el, 'tr')) {\n\t\tif (isTag(el, 'table|a|input|textarea')) {\n\t\t\tif (el.type != 'checkbox') {\n\t\t\t\treturn;\n\t\t\t}\n\t\t\tcheckboxClick.call(el, event);\n\t\t\tclick = false;\n\t\t}\n\t\tel = el.parentNode;\n\t\tif (!el) { // Ctrl+click on text fields hides the element\n\t\t\treturn;\n\t\t}\n\t}\n\tel = el.firstChild.firstChild;\n\tif (click) {\n\t\tel.checked = !el.checked;\n\t\tel.onclick && el.onclick();\n\t}\n\tif (el.name == 'check[]') {\n\t\tel.form['all'].checked = false;\n\t\tformUncheck('all-page');\n\t}\n\tif (/^(tables|views)\\[\\]\$/.test(el.name)) {\n\t\tformUncheck('check-all');\n\t}\n\ttrCheck(el);\n}\n\nlet lastChecked;\n\n/** Shift-click on checkbox for multiple selection.\n* @param MouseEvent\n* @this HTMLInputElement\n*/\nfunction checkboxClick(event) {\n\tif (!this.name) {\n\t\treturn;\n\t}\n\tif (event.shiftKey && (!lastChecked || lastChecked.name == this.name)) {\n\t\tconst checked = (lastChecked ? lastChecked.checked : true);\n\t\tlet checking = !lastChecked;\n\t\tfor (const input of qsa('input', parentTag(this, 'table'))) {\n\t\t\tif (input.name === this.name) {\n\t\t\t\tif (checking) {\n\t\t\t\t\tinput.checked = checked;\n\t\t\t\t\ttrCheck(input);\n\t\t\t\t}\n\t\t\t\tif (input === this || input === lastChecked) {\n\t\t\t\t\tif (checking) {\n\t\t\t\t\t\tbreak;\n\t\t\t\t\t}\n\t\t\t\t\tchecking = true;\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t} else {\n\t\tlastChecked = this;\n\t}\n}\n\n/** Set HTML code of an element\n* @param string\n* @param string undefined to set parentNode to empty string\n*/\nfunction setHtml(id, html) {\n\tconst el = qs('[id=\"' + id.replace(/[\\\\\"]/g, '\\\\\$&') + '\"]'); // database name is used as ID\n\tif (el) {\n\t\tif (html == null) {\n\t\t\tel.parentNode.innerHTML = '';\n\t\t} else {\n\t\t\tel.innerHTML = html;\n\t\t}\n\t}\n}\n\n/** Find node position\n* @param Node\n* @return number\n*/\nfunction nodePosition(el) {\n\tlet pos = 0;\n\twhile ((el = el.previousSibling)) {\n\t\tpos++;\n\t}\n\treturn pos;\n}\n\n/** Go to the specified page\n* @param string\n* @param string\n*/\nfunction pageClick(href, page) {\n\tif (!isNaN(page) && page) {\n\t\tlocation.href = href + (page != 1 ? '&page=' + (page - 1) : '');\n\t}\n}\n\n\n\n/** Display items in menu\n* @param MouseEvent\n* @this HTMLElement\n*/\nfunction menuOver(event) {\n\tconst a = event.target;\n\tif (isTag(a, 'a|span') && a.offsetLeft + a.offsetWidth > a.parentNode.offsetWidth - 15) { // 15 - ellipsis\n\t\tthis.style.overflow = 'visible';\n\t}\n}\n\n/** Hide items in menu\n* @this HTMLElement\n*/\nfunction menuOut() {\n\tthis.style.overflow = 'hidden';\n}\n\n\n\n/** Add row in select fieldset\n* @this HTMLSelectElement\n*/\nfunction selectAddRow() {\n\tconst field = this;\n\tconst row = cloneNode(field.parentNode);\n\tfield.onchange = selectFieldChange;\n\tfield.onchange();\n\tfor (const select of qsa('select', row)) {\n\t\tselect.name = select.name.replace(/[a-z]\\[\\d+/, '\$&1');\n\t\tselect.selectedIndex = 0;\n\t}\n\tfor (const input of qsa('input', row)) {\n\t\tinput.name = input.name.replace(/[a-z]\\[\\d+/, '\$&1');\n\t\tinput.className = '';\n\t\tif (input.type == 'checkbox') {\n\t\t\tinput.checked = false;\n\t\t} else {\n\t\t\tinput.value = '';\n\t\t}\n\t}\n\tfield.parentNode.parentNode.appendChild(row);\n}\n\n/** Prevent onsearch handler on Enter\n* @param KeyboardEvent\n* @this HTMLInputElement\n*/\nfunction selectSearchKeydown(event) {\n\tif (event.keyCode == 13 || event.keyCode == 10) {\n\t\tthis.onsearch = () => { };\n\t}\n}\n\n/** Clear column name after resetting search\n* @this HTMLInputElement\n*/\nfunction selectSearchSearch() {\n\tif (!this.value) {\n\t\tthis.parentNode.firstChild.selectedIndex = 0;\n\t}\n}\n\n\n\n/** Toggle column context menu\n* @param [string] extra class name\n* @this HTMLElement\n*/\nfunction columnMouse(className) {\n\tfor (const span of qsa('span', this)) {\n\t\tif (/column/.test(span.className)) {\n\t\t\tspan.className = 'column' + (className || '');\n\t\t}\n\t}\n}\n\n\n\n/** Fill column in search field\n* @param string\n* @return boolean false\n*/\nfunction selectSearch(name) {\n\tlet el = qs('#fieldset-search');\n\tel.className = '';\n\tconst divs = qsa('div', el);\n\tlet i, div;\n\tfor (i=0; i < divs.length; i++) {\n\t\tdiv = divs[i];\n\t\tel = qs('[name\$=\"[col]\"]', div);\n\t\tif (el && selectValue(el) == name) {\n\t\t\tbreak;\n\t\t}\n\t}\n\tif (i == divs.length) {\n\t\tdiv.firstChild.value = name;\n\t\tdiv.firstChild.onchange();\n\t}\n\tqs('[name\$=\"[val]\"]', div).focus();\n\treturn false;\n}\n\n\n/** Check if Ctrl key (Command key on Mac) was pressed\n* @param KeyboardEvent|MouseEvent\n* @return boolean\n*/\nfunction isCtrl(event) {\n\treturn (event.ctrlKey || event.metaKey) && !event.altKey; // shiftKey allowed\n}\n\n\n\n/** Send form by Ctrl+Enter on <select> and <textarea>\n* @param KeyboardEvent\n* @param [string]\n* @return boolean\n*/\nfunction bodyKeydown(event, button) {\n\teventStop(event);\n\tlet target = event.target;\n\tif (target.jushTextarea) {\n\t\ttarget = target.jushTextarea;\n\t}\n\tif (isCtrl(event) && (event.keyCode == 13 || event.keyCode == 10) && isTag(target, 'select|textarea|input')) { // 13|10 - Enter\n\t\ttarget.blur();\n\t\tif (target.form[button]) {\n\t\t\ttarget.form[button].click();\n\t\t} else {\n\t\t\ttarget.form.dispatchEvent(new Event('submit', {bubbles: true}));\n\t\t\ttarget.form.submit();\n\t\t}\n\t\ttarget.focus();\n\t\treturn false;\n\t}\n\treturn true;\n}\n\n/** Open form to a new window on Ctrl+click or Shift+click\n* @param MouseEvent\n*/\nfunction bodyClick(event) {\n\tconst target = event.target;\n\tif ((isCtrl(event) || event.shiftKey) && target.type == 'submit' && isTag(target, 'input')) {\n\t\ttarget.form.target = '_blank';\n\t\tsetTimeout(() => {\n\t\t\t// if (isCtrl(event)) { focus(); } doesn't work\n\t\t\ttarget.form.target = '';\n\t\t}, 0);\n\t}\n}\n\n\n\n/** Change focus by Ctrl+Shift+Up or Ctrl+Shift+Down\n* @param KeyboardEvent\n* @return boolean\n*/\nfunction editingKeydown(event) {\n\tif ((event.keyCode == 40 || event.keyCode == 38) && isCtrl(event)) { // 40 - Down, 38 - Up\n\t\tconst target = event.target;\n\t\tconst sibling = (event.keyCode == 40 ? 'nextSibling' : 'previousSibling');\n\t\tlet el = target.parentNode.parentNode[sibling];\n\t\tif (el && (isTag(el, 'tr') || (el = el[sibling])) && isTag(el, 'tr') && (el = el.childNodes[nodePosition(target.parentNode)]) && (el = el.childNodes[nodePosition(target)])) {\n\t\t\tel.focus();\n\t\t}\n\t\treturn false;\n\t}\n\tif (event.shiftKey && !bodyKeydown(event, 'insert')) {\n\t\treturn false;\n\t}\n\treturn true;\n}\n\n/** Disable maxlength for functions\n* @this HTMLSelectElement\n*/\nfunction functionChange() {\n\tconst input = this.form[this.name.replace(/^function/, 'fields')];\n\tif (input) { // undefined with the set data type\n\t\tif (selectValue(this)) {\n\t\t\tif (input.origType === undefined) {\n\t\t\t\tinput.origType = input.type;\n\t\t\t\tinput.origMaxLength = input.dataset.maxlength;\n\t\t\t}\n\t\t\tdelete input.dataset.maxlength;\n\t\t\tinput.type = 'text';\n\t\t} else if (input.origType) {\n\t\t\tinput.type = input.origType;\n\t\t\tif (input.origMaxLength >= 0) {\n\t\t\t\tinput.dataset.maxlength = input.origMaxLength;\n\t\t\t}\n\t\t}\n\t\toninput({target: input});\n\t}\n\thelpClose();\n}\n\n/** Skip 'original' when typing\n* @param number\n* @this HTMLTableCellElement\n*/\nfunction skipOriginal(first) {\n\tconst fnSelect = qs('select', this.previousSibling);\n\tif (fnSelect.selectedIndex < first) {\n\t\tfnSelect.selectedIndex = first;\n\t}\n}\n\n/** Add new field in schema-less edit\n* @this HTMLInputElement\n*/\nfunction fieldChange() {\n\tconst row = cloneNode(parentTag(this, 'tr'));\n\tfor (const input of qsa('input', row)) {\n\t\tinput.value = '';\n\t}\n\t// keep value in <select> (function)\n\tparentTag(this, 'table').appendChild(row);\n\tthis.oninput = () => { };\n}\n\n\n\n/** Create AJAX request\n* @param string\n* @param function (XMLHttpRequest)\n* @param [string]\n* @param [string]\n* @return XMLHttpRequest or false in case of an error\n* @uses offlineMessage\n*/\nfunction ajax(url, callback, data, message) {\n\tconst request = new XMLHttpRequest();\n\tif (request) {\n\t\tconst ajaxStatus = qs('#ajaxstatus');\n\t\tif (message) {\n\t\t\tajaxStatus.innerHTML = '<div class=\"message\">' + message + '</div>';\n\t\t}\n\t\talterClass(ajaxStatus, 'hidden', !message);\n\t\trequest.open((data ? 'POST' : 'GET'), url);\n\t\tif (data) {\n\t\t\trequest.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');\n\t\t}\n\t\trequest.setRequestHeader('X-Requested-With', 'XMLHttpRequest');\n\t\trequest.onreadystatechange = () => {\n\t\t\tif (request.readyState == 4) {\n\t\t\t\tif (/^2/.test(request.status)) {\n\t\t\t\t\tcallback(request);\n\t\t\t\t} else if (message !== null) {\n\t\t\t\t\tajaxStatus.innerHTML = (request.status ? request.responseText : '<div class=\"error\">' + offlineMessage + '</div>');\n\t\t\t\t\talterClass(ajaxStatus, 'hidden');\n\t\t\t\t}\n\t\t\t}\n\t\t};\n\t\trequest.send(data);\n\t}\n\treturn request;\n}\n\n/** Use setHtml(key, value) for JSON response\n* @param string\n* @return boolean false for success\n*/\nfunction ajaxSetHtml(url) {\n\treturn !ajax(url, request => {\n\t\tconst data = JSON.parse(request.responseText);\n\t\tfor (const key in data) {\n\t\t\tsetHtml(key, data[key]);\n\t\t}\n\t});\n}\n\nlet editChanged; // used by plugins\nlet adminerHighlighter = els => {}; // overwritten by syntax highlighters\n\n/** Save form contents through AJAX\n* @param HTMLFormElement\n* @param string\n* @param [HTMLInputElement]\n* @return boolean\n*/\nfunction ajaxForm(form, message, button) {\n\tlet data = [];\n\tfor (const el of form.elements) {\n\t\tif (el.name && !el.disabled) {\n\t\t\tif (/^file\$/i.test(el.type) && el.value) {\n\t\t\t\treturn false;\n\t\t\t}\n\t\t\tif (!/^(checkbox|radio|submit|file)\$/i.test(el.type) || el.checked || el == button) {\n\t\t\t\tdata.push(encodeURIComponent(el.name) + '=' + encodeURIComponent(isTag(el, 'select') ? selectValue(el) : el.value));\n\t\t\t}\n\t\t}\n\t}\n\tdata = data.join('&');\n\n\tlet url = form.action;\n\tif (!/post/i.test(form.method)) {\n\t\turl = url.replace(/\\?.*/, '') + '?' + data;\n\t\tdata = '';\n\t}\n\treturn ajax(url, request => {\n\t\tconst ajaxstatus = qs('#ajaxstatus');\n\t\tsetHtml('ajaxstatus', request.responseText);\n\t\tif (qs('.message', ajaxstatus)) { // success\n\t\t\teditChanged = null;\n\t\t}\n\t\tadminerHighlighter(qsa('code', ajaxstatus));\n\t\tmessagesPrint(ajaxstatus);\n\t}, data, message);\n}\n\n\n\n/** Display edit field\n* @param MouseEvent\n* @param number display textarea instead of input, 2 - load long text\n* @param [string] warning to display\n* @return boolean\n* @this HTMLElement\n*/\nfunction selectClick(event, text, warning) {\n\tconst td = this;\n\tconst target = event.target;\n\tif (!isCtrl(event) || isTag(td.firstChild, 'input|textarea') || isTag(target, 'a')) {\n\t\treturn;\n\t}\n\tif (warning) {\n\t\talert(warning);\n\t\treturn true;\n\t}\n\tconst original = td.innerHTML;\n\ttext = text || /\\n/.test(original);\n\tconst input = document.createElement(text ? 'textarea' : 'input');\n\tinput.onkeydown = event => {\n\t\tif (event.keyCode == 27 && !event.shiftKey && !event.altKey && !isCtrl(event)) { // 27 - Esc\n\t\t\tinputBlur.apply(input);\n\t\t\ttd.innerHTML = original;\n\t\t}\n\t};\n\n\tconst pos = getSelection().anchorOffset;\n\tlet value = (td.firstChild && td.firstChild.alt) || td.textContent;\n\tconst tdStyle = window.getComputedStyle(td, null);\n\n\tinput.style.width = Math.max(td.clientWidth - parseFloat(tdStyle.paddingLeft) - parseFloat(tdStyle.paddingRight), (text ? 200 : 20)) + 'px';\n\n\tif (text) {\n\t\tlet rows = 1;\n\t\tvalue.replace(/\\n/g, () => {\n\t\t\trows++;\n\t\t});\n\t\tinput.rows = rows;\n\t}\n\tif (qsa('i', td).length) { // <i> - NULL\n\t\tvalue = '';\n\t}\n\ttd.innerHTML = '';\n\ttd.appendChild(input);\n\tsetupSubmitHighlight(td);\n\tinput.focus();\n\tif (text == 2) { // long text\n\t\treturn ajax(location.href + '&' + encodeURIComponent(td.id) + '=', request => {\n\t\t\tif (request.responseText) {\n\t\t\t\tinput.value = request.responseText;\n\t\t\t\tinput.name = td.id;\n\t\t\t}\n\t\t});\n\t}\n\tinput.value = value;\n\tinput.name = td.id;\n\tinput.selectionStart = pos;\n\tinput.selectionEnd = pos;\n\treturn true;\n}\n\n\n\n/** Load and display next page in select\n* @param number\n* @param string\n* @return boolean false for success\n* @this HTMLLinkElement\n*/\nfunction selectLoadMore(limit, loading) {\n\tconst a = this;\n\tconst title = a.innerHTML;\n\tconst href = a.href;\n\ta.innerHTML = loading;\n\tif (href) {\n\t\ta.removeAttribute('href');\n\t\treturn !ajax(href, request => {\n\t\t\tconst tbody = document.createElement('tbody');\n\t\t\ttbody.innerHTML = request.responseText;\n\t\t\tadminerHighlighter(qsa('code', tbody));\n\t\t\tqs('#table').appendChild(tbody);\n\t\t\tif (tbody.children.length < limit) {\n\t\t\t\ta.remove();\n\t\t\t} else {\n\t\t\t\ta.href = href.replace(/\\d+\$/, page => +page + 1);\n\t\t\t\ta.innerHTML = title;\n\t\t\t}\n\t\t});\n\t}\n}\n\n\n\n/** Stop event propagation\n* @param Event\n*/\nfunction eventStop(event) {\n\tevent.stopPropagation();\n}\n\n\n\n/** Setup highlighting of default submit button on form field focus\n* @param HTMLElement\n*/\nfunction setupSubmitHighlight(parent) {\n\tfor (const input of qsa('input, select, textarea', parent)) {\n\t\tsetupSubmitHighlightInput(input);\n\t}\n}\n\n/** Setup submit highlighting for single element\n* @param HTMLElement\n*/\nfunction setupSubmitHighlightInput(input) {\n\tif (!/submit|button|image|file/.test(input.type)) {\n\t\taddEvent(input, 'focus', inputFocus);\n\t\taddEvent(input, 'blur', inputBlur);\n\t}\n}\n\n/** Highlight default submit button\n* @this HTMLInputElement\n*/\nfunction inputFocus() {\n\talterClass(findDefaultSubmit(this), 'default', true);\n}\n\n/** Unhighlight default submit button\n* @this HTMLInputElement\n*/\nfunction inputBlur() {\n\talterClass(findDefaultSubmit(this), 'default');\n}\n\n/** Find submit button used by Enter\n* @param HTMLElement\n* @return HTMLInputElement\n*/\nfunction findDefaultSubmit(el) {\n\tif (el.jushTextarea) {\n\t\tel = el.jushTextarea;\n\t}\n\tif (!el.form) {\n\t\treturn null;\n\t}\n\tfor (const input of qsa('input', el.form)) {\n\t\tif (input.type == 'submit' && !input.style.zIndex) {\n\t\t\treturn input;\n\t\t}\n\t}\n}\n\n\n\n/** Add event listener\n* @param HTMLElement\n* @param string without 'on'\n* @param function\n*/\nfunction addEvent(el, action, handler) {\n\tel.addEventListener(action, handler, false);\n}\n\n/** Clone node and setup submit highlighting\n* @param HTMLElement\n* @return HTMLElement\n*/\nfunction cloneNode(el) {\n\tconst el2 = el.cloneNode(true);\n\tconst selector = 'input, select';\n\tconst origEls = qsa(selector, el);\n\tconst cloneEls = qsa(selector, el2);\n\tfor (let i=0; i < origEls.length; i++) {\n\t\tconst origEl = origEls[i];\n\t\tfor (const key in origEl) {\n\t\t\tif (/^on/.test(key) && origEl[key]) {\n\t\t\t\tcloneEls[i][key] = origEl[key];\n\t\t\t}\n\t\t}\n\t}\n\tsetupSubmitHighlight(el2);\n\treturn el2;\n}\n\noninput = event => {\n\tconst target = event.target;\n\tconst maxLength = target.dataset.maxlength;\n\talterClass(target, 'maxlength', target.value && maxLength != null && target.value.length > maxLength); // maxLength could be 0\n};\n\naddEvent(document, 'click', event => {\n\tif (!qs('#foot').contains(event.target)) {\n\t\talterClass(qs('#foot'), 'foot', true);\n\t}\n});\n'use strict'; // Adminer specific functions\n\nlet autocompleter; // set in adminer.inc.php\n\n/** Load syntax highlighting\n* @param string first three characters of database system version\n* @param [string]\n*/\nfunction syntaxHighlighting(version, vendor) {\n\taddEventListener('DOMContentLoaded', () => {\n\t\tif (window.jush) {\n\t\t\tjush.create_links = 'target=\"_blank\" rel=\"noreferrer noopener\"';\n\t\t\tif (version) {\n\t\t\t\tfor (let key in jush.urls) {\n\t\t\t\t\tlet obj = jush.urls;\n\t\t\t\t\tif (typeof obj[key] != 'string') {\n\t\t\t\t\t\tobj = obj[key];\n\t\t\t\t\t\tkey = 0;\n\t\t\t\t\t\tif (vendor == 'maria') {\n\t\t\t\t\t\t\tfor (let i = 1; i < obj.length; i++) {\n\t\t\t\t\t\t\t\tobj[i] = obj[i]\n\t\t\t\t\t\t\t\t\t.replace('.html', '/')\n\t\t\t\t\t\t\t\t\t.replace('-type-syntax', '-data-types')\n\t\t\t\t\t\t\t\t\t.replace(/numeric-(data-types)/, '\$1-\$&')\n\t\t\t\t\t\t\t\t\t.replace(/replication-options-(master|binary-log)\\//, 'replication-and-binary-log-system-variables/')\n\t\t\t\t\t\t\t\t\t.replace('server-options/', 'server-system-variables/')\n\t\t\t\t\t\t\t\t\t.replace('innodb-parameters/', 'innodb-system-variables/')\n\t\t\t\t\t\t\t\t\t.replace(/#(statvar|sysvar|option_mysqld)_(.*)/, '#\$2')\n\t\t\t\t\t\t\t\t\t.replace(/#sysvar_(.*)/, '#\$1')\n\t\t\t\t\t\t\t\t;\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\n\t\t\t\t\tobj[key] = (vendor == 'maria' ? obj[key].replace('dev.mysql.com/doc/mysql', 'mariadb.com/kb') : obj[key]) // MariaDB\n\t\t\t\t\t\t.replace('/doc/mysql', '/doc/refman/' + version) // MySQL\n\t\t\t\t\t;\n\t\t\t\t\tif (vendor != 'cockroach') {\n\t\t\t\t\t\tobj[key] = obj[key].replace('/docs/current', '/docs/' + version); // PostgreSQL\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t\tif (window.jushLinks) {\n\t\t\t\tjush.custom_links = jushLinks;\n\t\t\t}\n\t\t\tjush.highlight_tag('code', 0);\n\t\t\tadminerHighlighter = els => jush.highlight_tag(els, 0);\n\t\t\tfor (const tag of qsa('textarea')) {\n\t\t\t\tif (/(^|\\s)jush-/.test(tag.className)) {\n\t\t\t\t\tconst pre = jush.textarea(tag, autocompleter);\n\t\t\t\t\tif (pre) {\n\t\t\t\t\t\tsetupSubmitHighlightInput(pre);\n\t\t\t\t\t\ttag.onchange = () => {\n\t\t\t\t\t\t\tpre.textContent = tag.value;\n\t\t\t\t\t\t\tpre.oninput();\n\t\t\t\t\t\t};\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t});\n}\n\n/** Get value of dynamically created form field\n* @param HTMLFormElement\n* @param string\n* @return HTMLElement\n*/\nfunction formField(form, name) {\n\t// required in IE < 8, form.elements[name] doesn't work\n\tfor (let i=0; i < form.length; i++) {\n\t\tif (form[i].name == name) {\n\t\t\treturn form[i];\n\t\t}\n\t}\n}\n\n/** Try to change input type to password or to text\n* @param HTMLInputElement\n* @param boolean\n*/\nfunction typePassword(el, disable) {\n\ttry {\n\t\tel.type = (disable ? 'text' : 'password');\n\t} catch (e) { // empty\n\t}\n}\n\n/** Install toggle handler\n* @param [HTMLElement]\n*/\nfunction messagesPrint(parent) {\n\tfor (const el of qsa('.toggle', parent)) {\n\t\tel.onclick = partial(toggle, el.getAttribute('href').substr(1));\n\t}\n\tfor (const el of qsa('.copy', parent)) {\n\t\tel.onclick = () => {\n\t\t\tnavigator.clipboard.writeText(qs('code', el.parentElement).innerText).then(() => el.textContent = '\xe2\x9c\x93');\n\t\t\tsetTimeout(() => el.textContent = '\xf0\x9f\x97\x90', 1000);\n\t\t\treturn false;\n\t\t};\n\t}\n}\n\n\n\n/** Hide or show some login rows for selected driver\n* @param HTMLSelectElement\n*/\nfunction loginDriver(driver) {\n\tconst trs = parentTag(driver, 'table').rows;\n\tconst disabled = /sqlite/.test(selectValue(driver));\n\talterClass(trs[1], 'hidden', disabled);\t// 1 - row with server\n\ttrs[1].getElementsByTagName('input')[0].disabled = disabled;\n}\n\n\n\nlet dbCtrl;\nconst dbPrevious = {};\n\n/** Check if database should be opened to a new window\n* @param MouseEvent\n* @this HTMLSelectElement\n*/\nfunction dbMouseDown(event) {\n\t// Firefox: mouse-down event does not contain pressed key information for OPTION.\n\t// Chrome: mouse-down event has inherited key information from SELECT.\n\t// So we ignore the event for OPTION to work Ctrl+click correctly everywhere.\n\tif (event.target.tagName == \"OPTION\") {\n\t\treturn;\n\t}\n\n\tdbCtrl = isCtrl(event);\n\tif (dbPrevious[this.name] == undefined) {\n\t\tdbPrevious[this.name] = this.value;\n\t}\n}\n\n/** Load database after selecting it\n* @this HTMLSelectElement\n*/\nfunction dbChange() {\n\tif (dbCtrl) {\n\t\tthis.form.target = '_blank';\n\t}\n\tthis.form.submit();\n\tthis.form.target = '';\n\tif (dbCtrl && dbPrevious[this.name] != undefined) {\n\t\tthis.value = dbPrevious[this.name];\n\t\tdbPrevious[this.name] = undefined;\n\t}\n}\n\n\n\n/** Check whether the query will be executed with index\n* @this HTMLElement\n*/\nfunction selectFieldChange() {\n\tconst form = this.form;\n\tconst ok = (() => {\n\t\tfor (const input of qsa('input', form)) {\n\t\t\tif (input.value && /^fulltext/.test(input.name)) {\n\t\t\t\treturn true;\n\t\t\t}\n\t\t}\n\t\tlet ok = form.limit.value;\n\t\tlet group = false;\n\t\tconst columns = {};\n\t\tfor (const select of qsa('select', form)) {\n\t\t\tconst col = selectValue(select);\n\t\t\tlet match = /^(where.+)col]/.exec(select.name);\n\t\t\tif (match) {\n\t\t\t\tconst op = selectValue(form[match[1] + 'op]']);\n\t\t\t\tconst val = form[match[1] + 'val]'].value;\n\t\t\t\tif (col in indexColumns && (!/LIKE|REGEXP/.test(op) || (op == 'LIKE' && val.charAt(0) != '%'))) {\n\t\t\t\t\treturn true;\n\t\t\t\t} else if (col || val) {\n\t\t\t\t\tok = false;\n\t\t\t\t}\n\t\t\t}\n\t\t\tif ((match = /^(columns.+)fun]/.exec(select.name))) {\n\t\t\t\tif (/^(avg|count|count distinct|group_concat|max|min|sum)\$/.test(col)) {\n\t\t\t\t\tgroup = true;\n\t\t\t\t}\n\t\t\t\tconst val = selectValue(form[match[1] + 'col]']);\n\t\t\t\tif (val) {\n\t\t\t\t\tcolumns[col && col != 'count' ? '' : val] = 1;\n\t\t\t\t}\n\t\t\t}\n\t\t\tif (col && /^order/.test(select.name)) {\n\t\t\t\tif (!(col in indexColumns)) {\n\t\t\t\t\tok = false;\n\t\t\t\t}\n\t\t\t\tbreak;\n\t\t\t}\n\t\t}\n\t\tif (group) {\n\t\t\tfor (const col in columns) {\n\t\t\t\tif (!(col in indexColumns)) {\n\t\t\t\t\tok = false;\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t\treturn ok;\n\t})();\n\tsetHtml('noindex', (ok ? '' : '!'));\n}\n\n\n\nlet added = '.', rowCount;\n\n/** Check if val is equal to a-delimiter-b where delimiter is '_', '' or big letter\n* @param string\n* @param string\n* @param string\n* @return boolean\n*/\nfunction delimiterEqual(val, a, b) {\n\treturn (val == a + '_' + b || val == a + b || val == a + b.charAt(0).toUpperCase() + b.substr(1));\n}\n\n/** Escape string to use as identifier\n* @param string\n* @return string\n*/\nfunction idfEscape(s) {\n\treturn s.replace(/`/, '``');\n}\n\n\n\n/** Set up event handlers for edit_fields().\n*/\nfunction editFields() {\n\tfor (const el of qsa('[name\$=\"[field]\"]')) {\n\t\tel.oninput = function () {\n\t\t\teditingNameChange.call(this);\n\t\t\tif (!this.defaultValue) {\n\t\t\t\teditingAddRow.call(this);\n\t\t\t}\n\t\t};\n\t}\n\tfor (const el of qsa('[name\$=\"[length]\"]')) {\n\t\tmixin(el, {onfocus: editingLengthFocus, oninput: editingLengthChange});\n\t}\n\tfor (const el of qsa('[name\$=\"[type]\"]')) {\n\t\tmixin(el, {\n\t\t\tonfocus: function () {\n\t\t\t\tlastType = selectValue(this);\n\t\t\t},\n\t\t\tonchange: editingTypeChange,\n\t\t\tonmouseover: function (event) {\n\t\t\t\thelpMouseover.call(this, event, event.target.value, 1);\n\t\t\t},\n\t\t\tonmouseout: helpMouseout\n\t\t});\n\t}\n}\n\n/** Handle clicks on fields editing\n* @param MouseEvent\n* @return boolean false to cancel action\n*/\nfunction editingClick(event) {\n\tlet el = parentTag(event.target, 'button');\n\tif (el) {\n\t\tconst name = el.name;\n\t\tif (/^add\\[/.test(name)) {\n\t\t\teditingAddRow.call(el, 1);\n\t\t} else if (/^up\\[/.test(name)) {\n\t\t\teditingMoveRow.call(el, 1);\n\t\t} else if (/^down\\[/.test(name)) {\n\t\t\teditingMoveRow.call(el);\n\t\t} else if (/^drop_col\\[/.test(name)) {\n\t\t\teditingRemoveRow.call(el, 'fields\$1[field]');\n\t\t}\n\t\treturn false;\n\t}\n\tel = event.target;\n\tif (!isTag(el, 'input')) {\n\t\tel = parentTag(el, 'label');\n\t\tel = el && qs('input', el);\n\t}\n\tif (el) {\n\t\tconst name = el.name;\n\t\tif (name == 'auto_increment_col') {\n\t\t\tconst field = el.form['fields[' + el.value + '][field]'];\n\t\t\tif (!field.value) {\n\t\t\t\tfield.value = 'id';\n\t\t\t\tfield.oninput();\n\t\t\t}\n\t\t}\n\t}\n}\n\n/** Handle input on fields editing\n* @param InputEvent\n*/\nfunction editingInput(event) {\n\tconst el = event.target;\n\tif (/\\[default]\$/.test(el.name)) {\n\t\t el.previousElementSibling.checked = true;\n\t\t el.previousElementSibling.selectedIndex = Math.max(el.previousElementSibling.selectedIndex, 1);\n\t}\n}\n\n/** Detect foreign key\n* @this HTMLInputElement\n*/\nfunction editingNameChange() {\n\tconst name = this.name.substr(0, this.name.length - 7);\n\tconst type = formField(this.form, name + '[type]');\n\tconst opts = type.options;\n\tlet candidate; // don't select anything with ambiguous match (like column `id`)\n\tconst val = this.value;\n\tfor (let i = opts.length; i--; ) {\n\t\tconst match = /(.+)`(.+)/.exec(opts[i].value);\n\t\tif (!match) { // common type\n\t\t\tif (candidate && i == opts.length - 2 && val == opts[candidate].value.replace(/.+`/, '') && name == 'fields[1]') { // single target table, link to column, first field - probably `id`\n\t\t\t\treturn;\n\t\t\t}\n\t\t\tbreak;\n\t\t}\n\t\tconst base = match[1];\n\t\tconst column = match[2];\n\t\tfor (const table of [ base, base.replace(/s\$/, ''), base.replace(/es\$/, '') ]) {\n\t\t\tif (val == column || val == table || delimiterEqual(val, table, column) || delimiterEqual(val, column, table)) {\n\t\t\t\tif (candidate) {\n\t\t\t\t\treturn;\n\t\t\t\t}\n\t\t\t\tcandidate = i;\n\t\t\t\tbreak;\n\t\t\t}\n\t\t}\n\t}\n\tif (candidate) {\n\t\ttype.selectedIndex = candidate;\n\t\ttype.onchange();\n\t}\n}\n\n/** Add table row for next field\n* @param [boolean]\n* @return boolean false\n* @this HTMLInputElement\n*/\nfunction editingAddRow(focus) {\n\tconst match = /(\\d+)(\\.\\d+)?/.exec(this.name);\n\tconst x = match[0] + (match[2] ? added.substr(match[2].length) : added) + '1';\n\tconst row = parentTag(this, 'tr');\n\tconst row2 = cloneNode(row);\n\tlet tags = qsa('select, input, button', row);\n\tlet tags2 = qsa('select, input, button', row2);\n\tfor (let i=0; i < tags.length; i++) {\n\t\ttags2[i].name = tags[i].name.replace(/[0-9.]+/, x);\n\t\ttags2[i].selectedIndex = (/\\[(generated)/.test(tags[i].name) ? 0 : tags[i].selectedIndex);\n\t}\n\ttags = qsa('input', row);\n\ttags2 = qsa('input', row2);\n\tconst input = tags2[0]; // IE loose tags2 after insertBefore()\n\tfor (let i=0; i < tags.length; i++) {\n\t\tif (tags[i].name == 'auto_increment_col') {\n\t\t\ttags2[i].value = x;\n\t\t\ttags2[i].checked = false;\n\t\t}\n\t\tif (/\\[(orig|field|comment|default)/.test(tags[i].name)) {\n\t\t\ttags2[i].value = '';\n\t\t}\n\t\tif (/\\[(generated)/.test(tags[i].name)) {\n\t\t\ttags2[i].checked = false;\n\t\t}\n\t}\n\ttags[0].oninput = editingNameChange;\n\trow.parentNode.insertBefore(row2, row.nextSibling);\n\tif (focus) {\n\t\tinput.oninput = editingNameChange;\n\t\tinput.focus();\n\t}\n\tadded += '0';\n\trowCount++;\n\treturn false;\n}\n\n/** Remove table row for field\n* @param string regular expression replacement\n* @return boolean false\n* @this HTMLInputElement\n*/\nfunction editingRemoveRow(name) {\n\tconst field = formField(this.form, this.name.replace(/[^[]+(.+)/, name));\n\tfield.remove();\n\tparentTag(this, 'tr').style.display = 'none';\n\treturn false;\n}\n\n/** Move table row for field\n* @param [boolean]\n* @return boolean false for success\n* @this HTMLInputElement\n*/\nfunction editingMoveRow(up){\n\tconst row = parentTag(this, 'tr');\n\tif (!('nextElementSibling' in row)) {\n\t\treturn true;\n\t}\n\trow.parentNode.insertBefore(row, up\n\t\t? row.previousElementSibling\n\t\t: row.nextElementSibling ? row.nextElementSibling.nextElementSibling : row.parentNode.firstChild);\n\treturn false;\n}\n\nlet lastType = '';\n\n/** Clear length and hide collation or unsigned\n* @this HTMLSelectElement\n*/\nfunction editingTypeChange() {\n\tconst type = this;\n\tconst name = type.name.substr(0, type.name.length - 6);\n\tconst text = selectValue(type);\n\tfor (const el of type.form.elements) {\n\t\tif (el.name == name + '[length]') {\n\t\t\tif (!(\n\t\t\t\t(/(char|binary)\$/.test(lastType) && /(char|binary)\$/.test(text))\n\t\t\t\t|| (/(enum|set)\$/.test(lastType) && /(enum|set)\$/.test(text))\n\t\t\t)) {\n\t\t\t\tel.value = '';\n\t\t\t}\n\t\t\tel.oninput.apply(el);\n\t\t}\n\t\tif (lastType == 'timestamp' && el.name == name + '[generated]' && /timestamp/i.test(formField(type.form, name + '[default]').value)) {\n\t\t\tel.checked = false;\n\t\t\tel.selectedIndex = 0;\n\t\t}\n\t\tif (el.name == name + '[collation]') {\n\t\t\talterClass(el, 'hidden', !/(char|text|enum|set)\$/.test(text));\n\t\t}\n\t\tif (el.name == name + '[unsigned]') {\n\t\t\talterClass(el, 'hidden', !/(^|[^o])int(?!er)|numeric|real|float|double|decimal|money/.test(text));\n\t\t}\n\t\tif (el.name == name + '[on_update]') {\n\t\t\talterClass(el, 'hidden', !/timestamp|datetime/.test(text)); // MySQL supports datetime since 5.6.5\n\t\t}\n\t\tif (el.name == name + '[on_delete]') {\n\t\t\talterClass(el, 'hidden', !/`/.test(text));\n\t\t}\n\t}\n\thelpClose();\n}\n\n/** Mark length as required\n* @this HTMLInputElement\n*/\nfunction editingLengthChange() {\n\talterClass(this, 'required', !this.value.length && /var(char|binary)\$/.test(selectValue(this.parentNode.previousSibling.firstChild)));\n}\n\n/** Edit enum or set\n* @this HTMLInputElement\n*/\nfunction editingLengthFocus() {\n\tconst td = this.parentNode;\n\tif (/^(enum|set)\$/.test(selectValue(td.previousSibling.firstChild))) {\n\t\tconst edit = qs('#enum-edit');\n\t\tedit.value = enumValues(this.value);\n\t\ttd.appendChild(edit);\n\t\tthis.style.display = 'none';\n\t\tedit.style.display = 'inline';\n\t\tedit.focus();\n\t}\n}\n\n/** Get enum values\n* @param string\n* @return string values separated by newlines\n*/\nfunction enumValues(s) {\n\tconst re = /(^|,)\\s*'(([^\\\\']|\\\\.|'')*)'\\s*/g;\n\tconst result = [];\n\tlet offset = 0;\n\tlet match;\n\twhile ((match = re.exec(s))) {\n\t\tif (offset != match.index) {\n\t\t\tbreak;\n\t\t}\n\t\tresult.push(match[2].replace(/'(')|\\\\(.)/g, '\$1\$2'));\n\t\toffset += match[0].length;\n\t}\n\treturn (offset == s.length ? result.join('\\n') : s);\n}\n\n/** Finish editing of enum or set\n* @this HTMLTextAreaElement\n*/\nfunction editingLengthBlur() {\n\tconst field = this.parentNode.firstChild;\n\tconst val = this.value;\n\tfield.value = (/^'[^\\n]+'\$/.test(val) ? val : val && \"'\" + val.replace(/\\n+\$/, '').replace(/'/g, \"''\").replace(/\\\\/g, '\\\\\\\\').replace(/\\n/g, \"','\") + \"'\");\n\tfield.style.display = 'inline';\n\tthis.style.display = 'none';\n}\n\n/** Show or hide selected table column\n* @param boolean\n* @param number\n*/\nfunction columnShow(checked, column) {\n\tfor (const tr of qsa('tr', qs('#edit-fields'))) {\n\t\talterClass(qsa('td', tr)[column], 'hidden', !checked);\n\t}\n}\n\n/** Show or hide index column options\n* @param boolean\n*/\nfunction indexOptionsShow(checked) {\n\tfor (const option of qsa('.idxopts')) {\n\t\talterClass(option, 'hidden', !checked);\n\t}\n}\n\n/** Display partition options\n* @this HTMLSelectElement\n*/\nfunction partitionByChange() {\n\tconst partitionTable = /RANGE|LIST/.test(selectValue(this));\n\talterClass(this.form['partitions'], 'hidden', partitionTable || !this.selectedIndex);\n\talterClass(qs('#partition-table'), 'hidden', !partitionTable);\n\thelpClose();\n}\n\n/** Add next partition row\n* @this HTMLInputElement\n*/\nfunction partitionNameChange() {\n\tconst row = cloneNode(parentTag(this, 'tr'));\n\trow.firstChild.firstChild.value = '';\n\tparentTag(this, 'table').appendChild(row);\n\tthis.oninput = () => { };\n}\n\n/** Show or hide comment fields\n* @param HTMLInputElement\n* @param [boolean] whether to focus Comment if checked\n*/\nfunction editingCommentsClick(el, focus) {\n\tconst comment = el.form['Comment'];\n\tcolumnShow(el.checked, 6);\n\talterClass(comment, 'hidden', !el.checked);\n\tif (focus && el.checked) {\n\t\tcomment.focus();\n\t}\n}\n\n\n\n/** Uncheck 'all' checkbox\n* @param MouseEvent\n* @this HTMLTableElement\n*/\nfunction dumpClick(event) {\n\tlet el = parentTag(event.target, 'label');\n\tif (el) {\n\t\tel = qs('input', el);\n\t\tconst match = /(.+)\\[]\$/.exec(el.name);\n\t\tif (match) {\n\t\t\tcheckboxClick.call(el, event);\n\t\t\tformUncheck('check-' + match[1]);\n\t\t}\n\t}\n}\n\n\n\n/** Add row for foreign key\n* @this HTMLSelectElement\n*/\nfunction foreignAddRow() {\n\tconst row = cloneNode(parentTag(this, 'tr'));\n\tthis.onchange = () => { };\n\tfor (const select of qsa('select', row)) {\n\t\tselect.name = select.name.replace(/\\d+]/, '1\$&');\n\t\tselect.selectedIndex = 0;\n\t}\n\tparentTag(this, 'table').appendChild(row);\n}\n\n\n\n/** Add row for indexes\n* @this HTMLSelectElement\n*/\nfunction indexesAddRow() {\n\tconst row = cloneNode(parentTag(this, 'tr'));\n\tthis.onchange = () => { };\n\tfor (const select of qsa('select', row)) {\n\t\tselect.name = select.name.replace(/indexes\\[\\d+/, '\$&1');\n\t\tselect.selectedIndex = 0;\n\t}\n\tfor (const input of qsa('input', row)) {\n\t\tinput.name = input.name.replace(/indexes\\[\\d+/, '\$&1');\n\t\tinput.value = '';\n\t}\n\tparentTag(this, 'table').appendChild(row);\n}\n\n/** Change column in index\n* @param string name prefix\n* @this HTMLSelectElement\n*/\nfunction indexesChangeColumn(prefix) {\n\tconst names = [];\n\tfor (const tag in { 'select': 1, 'input': 1 }) {\n\t\tfor (const column of qsa(tag, parentTag(this, 'td'))) {\n\t\t\tif (/\\[columns]/.test(column.name)) {\n\t\t\t\tconst value = selectValue(column);\n\t\t\t\tif (value) {\n\t\t\t\t\tnames.push(value);\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n\tthis.form[this.name.replace(/].*/, '][name]')].value = prefix + names.join('_');\n}\n\n/** Add column for index\n* @param string name prefix\n* @this HTMLSelectElement\n*/\nfunction indexesAddColumn(prefix) {\n\tconst field = this;\n\tconst select = field.form[field.name.replace(/].*/, '][type]')];\n\tif (!select.selectedIndex) {\n\t\twhile (selectValue(select) != \"INDEX\" && select.selectedIndex < select.options.length) {\n\t\t\tselect.selectedIndex++;\n\t\t}\n\t\tselect.onchange();\n\t}\n\tconst column = cloneNode(field.parentNode);\n\tfor (const select of qsa('select', column)) {\n\t\tselect.name = select.name.replace(/]\\[\\d+/, '\$&1');\n\t\tselect.selectedIndex = 0;\n\t}\n\tfield.onchange = partial(indexesChangeColumn, prefix);\n\tfor (const input of qsa('input', column)) {\n\t\tinput.name = input.name.replace(/]\\[\\d+/, '\$&1');\n\t\tif (input.type != 'checkbox') {\n\t\t\tinput.value = '';\n\t\t}\n\t}\n\tparentTag(field, 'td').appendChild(column);\n\tfield.onchange();\n}\n\n\n\n/** Update the form action\n* @param HTMLFormElement\n* @param string\n*/\nfunction sqlSubmit(form, root) {\n\tconst action = root\n\t\t+ '&sql=' + encodeURIComponent(form['query'].value)\n\t\t+ (form['limit'].value ? '&limit=' + +form['limit'].value : '')\n\t\t+ (form['error_stops'].checked ? '&error_stops=1' : '')\n\t\t+ (form['only_errors'].checked ? '&only_errors=1' : '')\n\t;\n\tif ((document.location.origin + document.location.pathname + action).length < 2000) { // reasonable minimum is 2048\n\t\tform.action = action;\n\t}\n}\n\n/** Check if PHP can handle the uploaded files\n* @param Event\n* @param number\n* @param string\n* @param number\n* @param string\n*/\nfunction fileChange(event, count, countMessage, size, sizeMessage) {\n\tif (event.target.files.length > count) {\n\t\talert(countMessage);\n\t} else if (Array.from(event.target.files).reduce((sum, file) => sum + file.size, 0) > size) {\n\t\talert(sizeMessage);\n\t}\n}\n\n\n\n/** Handle changing trigger time or event\n* @param RegExp\n* @param string\n* @param HTMLFormElement\n*/\nfunction triggerChange(tableRe, table, form) {\n\tconst formEvent = selectValue(form['Event']);\n\tif (tableRe.test(form['Trigger'].value)) {\n\t\tform['Trigger'].value = table + '_' + (selectValue(form['Timing']).charAt(0) + formEvent.charAt(0)).toLowerCase();\n\t}\n\talterClass(form['Of'], 'hidden', !/ OF/.test(formEvent));\n}\n\n\n\nlet that, x, y; // em and tablePos defined in schema.inc.php\n\n/** Get mouse position\n* @param MouseEvent\n* @this HTMLElement\n*/\nfunction schemaMousedown(event) {\n\tif ((event.which || event.button) == 1) {\n\t\tthat = this;\n\t\tx = event.clientX - this.offsetLeft;\n\t\ty = event.clientY - this.offsetTop;\n\t}\n}\n\n/** Move object\n* @param MouseEvent\n*/\nfunction schemaMousemove(event) {\n\tif (that !== undefined) {\n\t\tconst left = (event.clientX - x) / em;\n\t\tconst top = (event.clientY - y) / em;\n\t\tconst lineSet = { };\n\t\tfor (const div of qsa('div', that)) {\n\t\t\tif (div.classList.contains('references')) {\n\t\t\t\tconst div2 = qs('[id=\"' + (/^refs/.test(div.id) ? 'refd' : 'refs') + div.id.substr(4) + '\"]');\n\t\t\t\tconst ref = (tablePos[div.title] || [ div2.parentNode.offsetTop / em, 0 ]);\n\t\t\t\tlet left1 = -1;\n\t\t\t\tconst id = div.id.replace(/^ref.(.+)-.+/, '\$1');\n\t\t\t\tif (div.parentNode != div2.parentNode) {\n\t\t\t\t\tleft1 = Math.min(0, ref[1] - left) - 1;\n\t\t\t\t\tdiv.style.left = left1 + 'em';\n\t\t\t\t\tdiv.querySelector('div').style.width = -left1 + 'em';\n\t\t\t\t\tconst left2 = Math.min(0, left - ref[1]) - 1;\n\t\t\t\t\tdiv2.style.left = left2 + 'em';\n\t\t\t\t\tdiv2.querySelector('div').style.width = -left2 + 'em';\n\t\t\t\t}\n\t\t\t\tif (!lineSet[id]) {\n\t\t\t\t\tconst line = qs('[id=\"' + div.id.replace(/^....(.+)-.+\$/, 'refl\$1') + '\"]');\n\t\t\t\t\tconst top1 = top + div.offsetTop / em;\n\t\t\t\t\tlet top2 = top + div2.offsetTop / em;\n\t\t\t\t\tif (div.parentNode != div2.parentNode) {\n\t\t\t\t\t\ttop2 += ref[0] - top;\n\t\t\t\t\t\tline.querySelector('div').style.height = Math.abs(top1 - top2) + 'em';\n\t\t\t\t\t}\n\t\t\t\t\tline.style.left = (left + left1) + 'em';\n\t\t\t\t\tline.style.top = Math.min(top1, top2) + 'em';\n\t\t\t\t\tlineSet[id] = true;\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t\tthat.style.left = left + 'em';\n\t\tthat.style.top = top + 'em';\n\t}\n}\n\n/** Finish move\n* @param MouseEvent\n* @param string\n*/\nfunction schemaMouseup(event, db) {\n\tif (that !== undefined) {\n\t\ttablePos[that.firstChild.firstChild.firstChild.data] = [ (event.clientY - y) / em, (event.clientX - x) / em ];\n\t\tthat = undefined;\n\t\tlet s = '';\n\t\tfor (const key in tablePos) {\n\t\t\ts += '_' + key + ':' + Math.round(tablePos[key][0]) + 'x' + Math.round(tablePos[key][1]);\n\t\t}\n\t\ts = encodeURIComponent(s.substr(1));\n\t\tconst link = qs('#schema-link');\n\t\tlink.href = link.href.replace(/[^=]+\$/, '') + s;\n\t\tcookie('adminer_schema-' + db + '=' + s, 30); //! special chars in db\n\t}\n}\n\n\n\nlet helpOpen, helpIgnore; // when mouse outs <option> then it mouse overs border of <select> - ignore it\n\n/** Display help\n* @param MouseEvent\n* @param string\n* @param bool display on left side (otherwise on top)\n* @this HTMLElement\n*/\nfunction helpMouseover(event, text, side) {\n\tconst target = event.target;\n\tif (!text) {\n\t\thelpClose();\n\t} else if (window.jush && (!helpIgnore || this != target)) {\n\t\thelpOpen = 1;\n\t\tconst help = qs('#help');\n\t\thelp.innerHTML = text;\n\t\tjush.highlight_tag([ help ]);\n\t\talterClass(help, 'hidden');\n\t\tconst rect = target.getBoundingClientRect();\n\t\tconst body = document.documentElement;\n\t\thelp.style.top = (body.scrollTop + rect.top - (side ? (help.offsetHeight - target.offsetHeight) / 2 : help.offsetHeight)) + 'px';\n\t\thelp.style.left = (body.scrollLeft + rect.left - (side ? help.offsetWidth : (help.offsetWidth - target.offsetWidth) / 2)) + 'px';\n\t}\n}\n\n/** Close help after timeout\n* @param MouseEvent\n* @this HTMLElement\n*/\nfunction helpMouseout(event) {\n\thelpOpen = 0;\n\thelpIgnore = (this != event.target);\n\tsetTimeout(() => {\n\t\tif (!helpOpen) {\n\t\t\thelpClose();\n\t\t}\n\t}, 200);\n}\n\n/** Close help\n*/\nfunction helpClose() {\n\talterClass(qs('#help'), 'hidden', true);\n}\n";
} elseif ($_GET["file"] == "jush.js") {
	header("Content-Type: text/javascript; charset=utf-8");
	echo "/** JUSH - JavaScript Syntax Highlighter\n* @link https://jush.sourceforge.io/\n* @author Jakub Vrana, https://www.vrana.cz\n* @copyright 2007 Jakub Vrana\n* @license https://www.apache.org/licenses/LICENSE-2.0 Apache License, Version 2.0\n*/\n\n/* Limitations:\n<style> and <script> supposes CDATA or HTML comments\nunnecessary escaping (e.g. echo \"\\'\" or ='&quot;') is removed\n*/\n\nvar jush = {\n\tcreate_links: true, // string for extra <a> parameters, e.g. 'target=\"_blank\"'\n\ttimeout: 1000, // milliseconds\n\tcustom_links: { }, // { state: { url: regexp } }, for example { php : { 'doc/\$&.html': /\\b(getData|setData)\\b/g } }\n\tapi: { }, // { state: { function: description } }, for example { php: { array: 'Create an array' } }\n\n\tphp: /<\\?(?!xml)(?:php)?|<script\\s+language\\s*=\\s*(?:\"php\"|'php'|php)\\s*>/i, // asp_tags=0, short_open_tag=1\n\tnum: /(?:0x[0-9a-f]+)|(?:\\b[0-9]+\\.?[0-9]*|\\.[0-9]+)(?:e[+-]?[0-9]+)?/i,\n\n\tregexps: undefined,\n\tsubpatterns: { },\n\n\t/** Link stylesheet\n\t* @param string\n\t* @param [string]\n\t*/\n\tstyle: function (href, media) {\n\t\tvar link = document.createElement('link');\n\t\tlink.rel = 'stylesheet';\n\t\tif (media) {\n\t\t\tlink.media = media;\n\t\t}\n\t\tlink.href = href;\n\t\tdocument.getElementsByTagName('head')[0].appendChild(link);\n\t},\n\n\t/** Highlight text\n\t* @param string\n\t* @param string\n\t* @return string\n\t*/\n\thighlight: function (language, text) {\n\t\tthis.last_tag = '';\n\t\tthis.last_class = '';\n\t\treturn '<span class=\"jush\">' + this.highlight_states([ language ], text.replace(/\\r\\n?/g, '\\n'), !/^(htm|tag|xml|txt)\$/.test(language))[0] + '</span>';\n\t},\n\n\t/** Highlight html\n\t* @param string\n\t* @param string\n\t* @return string\n\t*/\n\thighlight_html: function (language, html) {\n\t\tvar original = html.replace(/<br(\\s+[^>]*)?>/gi, '\\n');\n\t\tvar highlighted = jush.highlight(language, jush.html_entity_decode(original.replace(/<[^>]*>/g, '')));\n\n\t\tvar inject = { };\n\t\tvar pos = 0;\n\t\tvar last_offset = 0;\n\t\toriginal.replace(/(&[^;]+;)|(?:<[^>]+>)+/g, function (str, entity, offset) {\n\t\t\tpos += (offset - last_offset) + (entity ? 1 : 0);\n\t\t\tif (!entity) {\n\t\t\t\tinject[pos] = str;\n\t\t\t}\n\t\t\tlast_offset = offset + str.length;\n\t\t});\n\n\t\tpos = 0;\n\t\thighlighted = highlighted.replace(/([^&<]*)(?:(&[^;]+;)|(?:<[^>]+>)+|\$)/g, function (str, text, entity) {\n\t\t\tfor (var i = text.length; i >= 0; i--) {\n\t\t\t\tif (inject[pos + i]) {\n\t\t\t\t\tstr = str.substr(0, i) + inject[pos + i] + str.substr(i);\n\t\t\t\t\tdelete inject[pos + i];\n\t\t\t\t}\n\t\t\t}\n\t\t\tpos += text.length + (entity ? 1 : 0);\n\t\t\treturn str;\n\t\t});\n\t\treturn highlighted;\n\t},\n\n\t/** Highlight text in tags\n\t* @param mixed tag name or array of HTMLElement\n\t* @param number number of spaces for tab, 0 for tab itself, defaults to 4\n\t*/\n\thighlight_tag: function (tag, tab_width) {\n\t\tvar pre = (typeof tag == 'string' ? document.getElementsByTagName(tag) : tag);\n\t\tvar tab = '';\n\t\tfor (var i = (tab_width !== undefined ? tab_width : 4); i--; ) {\n\t\t\ttab += ' ';\n\t\t}\n\t\tvar i = 0;\n\t\tvar highlight = function () {\n\t\t\tvar start = new Date();\n\t\t\twhile (i < pre.length) {\n\t\t\t\tvar match = /(^|\\s)(?:jush|language(?=-\\S))(\$|\\s|-(\\S+))/.exec(pre[i].className); // https://www.w3.org/TR/html5/text-level-semantics.html#the-code-element\n\t\t\t\tif (match) {\n\t\t\t\t\tvar language = match[3] ? match[3] : 'htm';\n\t\t\t\t\tpre[i].innerHTML = '<span class=\"jush\"><span class=\"jush-' + language + '\">' + jush.highlight_html(language, pre[i].innerHTML.replace(/\\t/g, tab.length ? tab : '\\t')) + '</span></span>'; // span - enable style for class=\"language-\"\n\t\t\t\t}\n\t\t\t\ti++;\n\t\t\t\tif (jush.timeout && window.setTimeout && (new Date() - start) > jush.timeout) {\n\t\t\t\t\twindow.setTimeout(highlight, 100);\n\t\t\t\t\tbreak;\n\t\t\t\t}\n\t\t\t}\n\t\t};\n\t\thighlight();\n\t},\n\n\tlink_manual: function (language, text) {\n\t\tvar code = document.createElement('code');\n\t\tcode.innerHTML = this.highlight(language, text);\n\t\tvar as = code.getElementsByTagName('a');\n\t\tfor (var i = 0; i < as.length; i++) {\n\t\t\tif (as[i].href) {\n\t\t\t\treturn as[i].href;\n\t\t\t}\n\t\t}\n\t\treturn '';\n\t},\n\n\tcreate_link: function (link, s, attrs) {\n\t\treturn '<a'\n\t\t\t+ (this.create_links && link ? ' href=\"' + link + '\" class=\"jush-help\"' : '')\n\t\t\t+ (typeof this.create_links == 'string' ? ' ' + this.create_links.replace(/^\\s+/, '') : '')\n\t\t\t+ (attrs || '')\n\t\t\t+ '>' + s + '</a>'\n\t\t;\n\t},\n\n\tkeywords_links: function (state, s) {\n\t\tif (/^js(_write|_code)+\$/.test(state)) {\n\t\t\tstate = 'js';\n\t\t}\n\t\tif (/^(php_quo_var|php_php|php_sql|php_sqlite|php_pgsql|php_mssql|php_oracle|php_echo|php_phpini|php_http|php_mail)\$/.test(state)) {\n\t\t\tstate = 'php2';\n\t\t}\n\t\tif (state == 'sql_code') {\n\t\t\tstate = 'sql';\n\t\t}\n\t\tif (this.links2 && this.links2[state]) {\n\t\t\tvar url = this.urls[state];\n\t\t\tvar links2 = this.links2[state];\n\t\t\ts = s.replace(links2, function (str, match1) {\n\t\t\t\tfor (var i=arguments.length - 4; i > 1; i--) {\n\t\t\t\t\tif (arguments[i]) {\n\t\t\t\t\t\tvar link = (/^https?:/.test(url[i-1]) || !url[i-1] ? url[i-1] : url[0].replace(/\\\$key/g, url[i-1]));\n\t\t\t\t\t\tswitch (state) {\n\t\t\t\t\t\t\tcase 'php': link = link.replace(/\\\$1/g, arguments[i].toLowerCase()); break;\n\t\t\t\t\t\t\tcase 'php_new': link = link.replace(/\\\$1/g, arguments[i].toLowerCase()).replace(/\\\\/g, '-'); break; // toLowerCase() - case sensitive after #\n\t\t\t\t\t\t\tcase 'phpini': link = link.replace(/\\\$1/g, (/^suhosin\\./.test(arguments[i])) ? arguments[i] : arguments[i].toLowerCase().replace(/_/g, '-')); break;\n\t\t\t\t\t\t\tcase 'php_doc': link = link.replace(/\\\$1/g, arguments[i].replace(/^\\W+/, '')); break;\n\t\t\t\t\t\t\tcase 'js_doc': link = link.replace(/\\\$1/g, arguments[i].replace(/^\\W*(.)/, function (match, p1) { return p1.toUpperCase(); })); break;\n\t\t\t\t\t\t\tcase 'http': link = link.replace(/\\\$1/g, arguments[i].toLowerCase()); break;\n\t\t\t\t\t\t\tcase 'sql': link = link.replace(/\\\$1/g, arguments[i].replace(/\\b(ALTER|CREATE|DROP|RENAME|SHOW)\\s+SCHEMA\\b/, '\$1 DATABASE').toLowerCase().replace(/\\s+|_/g, '-')); break;\n\t\t\t\t\t\t\tcase 'sqlset': link = link.replace(/\\\$1/g, (links2.test(arguments[i].replace(/_/g, '-')) ? arguments[i].replace(/_/g, '-') : arguments[i]).toLowerCase()); break;\n\t\t\t\t\t\t\tcase 'sqlstatus': link = link.replace(/\\\$1/g, (/mariadb/.test(url[0]) ? arguments[i].toLowerCase() : arguments[i])); break;\n\t\t\t\t\t\t\tcase 'sqlite': link = link.replace(/\\\$1/g, arguments[i].toLowerCase().replace(/\\s+/g, '')); break;\n\t\t\t\t\t\t\tcase 'sqliteset': link = link.replace(/\\\$1/g, arguments[i].toLowerCase()); break;\n\t\t\t\t\t\t\tcase 'sqlitestatus': link = link.replace(/\\\$1/g, arguments[i].toLowerCase()); break;\n\t\t\t\t\t\t\tcase 'pgsql': link = link.replace(/\\\$1/g, arguments[i].toLowerCase().replace(/\\s+/g, (i == 1 ? '-' : ''))); break;\n\t\t\t\t\t\t\tcase 'pgsqlset': link = link.replace(/\\\$1/g, arguments[i].replace(/_/g, '-').toUpperCase()); break;\n\t\t\t\t\t\t\tcase 'cnf': link = link.replace(/\\\$1/g, arguments[i].toLowerCase()); break;\n\t\t\t\t\t\t\tcase 'js': link = link.replace(/\\\$1/g, arguments[i].replace(/\\./g, '/')); break;\n\t\t\t\t\t\t\tdefault: link = link.replace(/\\\$1/g, arguments[i]).replace(/\\\\/g, '-');\n\t\t\t\t\t\t}\n\t\t\t\t\t\tvar title = '';\n\t\t\t\t\t\tif (jush.api[state]) {\n\t\t\t\t\t\t\ttitle = jush.api[state][(state == 'js' ? arguments[i] : arguments[i].toLowerCase())];\n\t\t\t\t\t\t}\n\t\t\t\t\t\treturn (match1 ? match1 : '') + jush.create_link(link, arguments[i], (title ? ' title=\"' + jush.htmlspecialchars_quo(title) + '\"' : '')) + (arguments[arguments.length - 3] ? arguments[arguments.length - 3] : '');\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t});\n\t\t}\n\t\tif (this.custom_links[state]) {\n\t\t\tif (Array.isArray(this.custom_links[state])) { // backwards compatibility\n\t\t\t\tvar url = this.custom_links[state][0];\n\t\t\t\tvar re = this.custom_links[state][1];\n\t\t\t\tthis.custom_links[state] = {};\n\t\t\t\tthis.custom_links[state][url] = re;\n\t\t\t}\n\t\t\tfor (var url in this.custom_links[state]) {\n\t\t\t\ts = s.replace(this.custom_links[state][url], function (str) {\n\t\t\t\t\tvar offset = arguments[arguments.length - 2];\n\t\t\t\t\tif (/<[^>]*\$/.test(s.substr(0, offset)) || /^[^<]*<\\/a>/.test(s.substr(offset))) {\n\t\t\t\t\t\treturn str; // don't create links inside tags\n\t\t\t\t\t}\n\t\t\t\t\treturn '<a href=\"' + jush.htmlspecialchars_quo(url.replace('\$&', encodeURIComponent(str))) + '\" class=\"jush-custom\">' + str + '</a>' // not create_link() - ignores create_links\n\t\t\t\t});\n\t\t\t}\n\t\t}\n\t\treturn s;\n\t},\n\n\tbuild_regexp: function (key, tr1) {\n\t\tvar re = [ ];\n\t\tsubpatterns = [ '' ];\n\t\tfor (var k in tr1) {\n\t\t\tvar in_bra = false;\n\t\t\tsubpatterns.push(k);\n\t\t\tvar s = tr1[k].source.replace(/\\\\.|\\((?!\\?)|\\[|]|([a-z])(?:-([a-z]))?/gi, function (str, match1, match2) {\n\t\t\t\t// count capturing subpatterns\n\t\t\t\tif (str == (in_bra ? ']' : '[')) {\n\t\t\t\t\tin_bra = !in_bra;\n\t\t\t\t}\n\t\t\t\tif (str == '(') {\n\t\t\t\t\tsubpatterns.push(k);\n\t\t\t\t}\n\t\t\t\tif (match1 && tr1[k].ignoreCase) {\n\t\t\t\t\tif (in_bra) {\n\t\t\t\t\t\treturn str.toLowerCase() + str.toUpperCase();\n\t\t\t\t\t}\n\t\t\t\t\treturn '[' + match1.toLowerCase() + match1.toUpperCase() + ']' + (match2 ? '-[' + match2.toLowerCase() + match2.toUpperCase() + ']' : '');\n\t\t\t\t}\n\t\t\t\treturn str;\n\t\t\t});\n\t\t\tre.push('(' + s + ')');\n\t\t}\n\t\tthis.subpatterns[key] = subpatterns;\n\t\tthis.regexps[key] = new RegExp(re.join('|'), 'g');\n\t},\n\n\thighlight_states: function (states, text, in_php, escape) {\n\t\tif (!this.regexps) {\n\t\t\tthis.regexps = { };\n\t\t\tfor (var key in this.tr) {\n\t\t\t\tthis.build_regexp(key, this.tr[key]);\n\t\t\t}\n\t\t} else {\n\t\t\tfor (var key in this.tr) {\n\t\t\t\tthis.regexps[key].lastIndex = 0;\n\t\t\t}\n\t\t}\n\t\tvar state = states[states.length - 1];\n\t\tif (!this.tr[state]) {\n\t\t\treturn [ this.htmlspecialchars(text), states ];\n\t\t}\n\t\tvar ret = [ ]; // return\n\t\tfor (var i=1; i < states.length; i++) {\n\t\t\tret.push('<span class=\"jush-' + states[i] + '\">');\n\t\t}\n\t\tvar match;\n\t\tvar child_states = [ ];\n\t\tvar s_states;\n\t\tvar start = 0;\n\t\twhile (start < text.length && (match = this.regexps[state].exec(text))) {\n\t\t\tif (states[0] != 'htm' && /^<\\/(script|style)>\$/i.test(match[0])) {\n\t\t\t\tcontinue;\n\t\t\t}\n\t\t\tvar key, m = [ ];\n\t\t\tfor (var i = match.length; i--; ) {\n\t\t\t\tif (match[i] || !match[0].length) { // WScript returns empty string even for non matched subexpressions\n\t\t\t\t\tkey = this.subpatterns[state][i];\n\t\t\t\t\twhile (this.subpatterns[state][i - 1] == key) {\n\t\t\t\t\t\ti--;\n\t\t\t\t\t}\n\t\t\t\t\twhile (this.subpatterns[state][i] == key) {\n\t\t\t\t\t\tm.push(match[i]);\n\t\t\t\t\t\ti++;\n\t\t\t\t\t}\n\t\t\t\t\tbreak;\n\t\t\t\t}\n\t\t\t}\n\t\t\tif (!key) {\n\t\t\t\treturn [ 'regexp not found', [ ] ];\n\t\t\t}\n\n\t\t\tif (in_php && key == 'php') {\n\t\t\t\tcontinue;\n\t\t\t}\n\t\t\t//~ console.log(states + ' (' + key + '): ' + text.substring(start).replace(/\\n/g, '\\\\n'));\n\t\t\tvar out = (key.charAt(0) == '_');\n\t\t\tvar division = match.index + (key == 'php_halt2' ? match[0].length : 0);\n\t\t\tvar s = text.substring(start, division);\n\n\t\t\t// highlight children\n\t\t\tvar prev_state = states[states.length - 2];\n\t\t\tif (/^(att_quo|att_apo|att_val)\$/.test(state) && (/^(att_js|att_css|att_http)\$/.test(prev_state) || /^\\s*javascript:/i.test(s))) { // javascript: - easy but without own state //! should be checked only in %URI;\n\t\t\t\tchild_states.unshift(prev_state == 'att_css' ? 'css_pro' : (prev_state == 'att_http' ? 'http' : 'js'));\n\t\t\t\ts_states = this.highlight_states(child_states, this.html_entity_decode(s), true, (state == 'att_apo' ? this.htmlspecialchars_apo : (state == 'att_quo' ? this.htmlspecialchars_quo : this.htmlspecialchars_quo_apo)));\n\t\t\t} else if (state == 'css_js' || state == 'cnf_http' || state == 'cnf_phpini' || state == 'sql_sqlset' || state == 'sqlite_sqliteset' || state == 'pgsql_pgsqlset') {\n\t\t\t\tchild_states.unshift(state.replace(/^[^_]+_/, ''));\n\t\t\t\ts_states = this.highlight_states(child_states, s, true);\n\t\t\t} else if ((state == 'php_quo' || state == 'php_apo') && /^(php_php|php_sql|php_sqlite|php_pgsql|php_mssql|php_oracle|php_phpini|php_http|php_mail)\$/.test(prev_state)) {\n\t\t\t\tchild_states.unshift(prev_state.substr(4));\n\t\t\t\ts_states = this.highlight_states(child_states, this.stripslashes(s), true, (state == 'php_apo' ? this.addslashes_apo : this.addslashes_quo));\n\t\t\t} else if (key == 'php_halt2') {\n\t\t\t\tchild_states.unshift('htm');\n\t\t\t\ts_states = this.highlight_states(child_states, s, true);\n\t\t\t} else if ((state == 'apo' || state == 'quo') && prev_state == 'js_write_code') {\n\t\t\t\tchild_states.unshift('htm');\n\t\t\t\ts_states = this.highlight_states(child_states, s, true);\n\t\t\t} else if ((state == 'apo' || state == 'quo') && prev_state == 'js_http_code') {\n\t\t\t\tchild_states.unshift('http');\n\t\t\t\ts_states = this.highlight_states(child_states, s, true);\n\t\t\t} else if (((state == 'php_quo' || state == 'php_apo') && prev_state == 'php_echo') || (state == 'php_eot2' && states[states.length - 3] == 'php_echo')) {\n\t\t\t\tvar i;\n\t\t\t\tfor (i=states.length; i--; ) {\n\t\t\t\t\tprev_state = states[i];\n\t\t\t\t\tif (prev_state.substring(0, 3) != 'php' && prev_state != 'att_quo' && prev_state != 'att_apo' && prev_state != 'att_val') {\n\t\t\t\t\t\tbreak;\n\t\t\t\t\t}\n\t\t\t\t\tprev_state = '';\n\t\t\t\t}\n\t\t\t\tvar f = (state == 'php_eot2' ? this.addslashes : (state == 'php_apo' ? this.addslashes_apo : this.addslashes_quo));\n\t\t\t\ts = this.stripslashes(s);\n\t\t\t\tif (/^(att_js|att_css|att_http)\$/.test(prev_state)) {\n\t\t\t\t\tvar g = (states[i+1] == 'att_quo' ? this.htmlspecialchars_quo : (states[i+1] == 'att_apo' ? this.htmlspecialchars_apo : this.htmlspecialchars_quo_apo));\n\t\t\t\t\tchild_states.unshift(prev_state == 'att_js' ? 'js' : prev_state.substr(4));\n\t\t\t\t\ts_states = this.highlight_states(child_states, this.html_entity_decode(s), true, function (string) { return f(g(string)); });\n\t\t\t\t} else if (prev_state && child_states) {\n\t\t\t\t\tchild_states.unshift(prev_state);\n\t\t\t\t\ts_states = this.highlight_states(child_states, s, true, f);\n\t\t\t\t} else {\n\t\t\t\t\ts = this.htmlspecialchars(s);\n\t\t\t\t\ts_states = [ (escape ? escape(s) : s), (!out || !/^(att_js|att_css|att_http|css_js|js_write_code|js_http_code|php_php|php_sql|php_sqlite|php_pgsql|php_mssql|php_oracle|php_echo|php_phpini|php_http|php_mail)\$/.test(state) ? child_states : [ ]) ];\n\t\t\t\t}\n\t\t\t} else {\n\t\t\t\ts = this.htmlspecialchars(s);\n\t\t\t\ts_states = [ (escape ? escape(s) : s), (!out || !/^(att_js|att_css|att_http|css_js|js_write_code|js_http_code|php_php|php_sql|php_sqlite|php_pgsql|php_mssql|php_oracle|php_echo|php_phpini|php_http|php_mail)\$/.test(state) ? child_states : [ ]) ]; // reset child states when leaving construct\n\t\t\t}\n\t\t\ts = s_states[0];\n\t\t\tchild_states = s_states[1];\n\t\t\ts = this.keywords_links(state, s);\n\t\t\tret.push(s);\n\n\t\t\ts = text.substring(division, match.index + match[0].length);\n\t\t\ts = (m.length < 3 ? (s ? '<span class=\"jush-op\">' + this.htmlspecialchars(escape ? escape(s) : s) + '</span>' : '') : (m[1] ? '<span class=\"jush-op\">' + this.htmlspecialchars(escape ? escape(m[1]) : m[1]) + '</span>' : '') + this.htmlspecialchars(escape ? escape(m[2]) : m[2]) + (m[3] ? '<span class=\"jush-op\">' + this.htmlspecialchars(escape ? escape(m[3]) : m[3]) + '</span>' : ''));\n\t\t\tif (!out) {\n\t\t\t\tif (this.links && this.links[key] && m[2]) {\n\t\t\t\t\tif (/^tag/.test(key)) {\n\t\t\t\t\t\tthis.last_tag = m[2].toLowerCase();\n\t\t\t\t\t}\n\t\t\t\t\tvar link = m[2].toLowerCase();\n\t\t\t\t\tvar k_link = '';\n\t\t\t\t\tfor (var k in this.links[key]) {\n\t\t\t\t\t\tvar m2 = this.links[key][k].exec(m[2]);\n\t\t\t\t\t\tif (m2) {\n\t\t\t\t\t\t\tif (m2[1]) {\n\t\t\t\t\t\t\t\tlink = m2[1].toLowerCase().replace(/\\\\/g, '-'); // \\ is PHP namespace;\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\tk_link = k;\n\t\t\t\t\t\t\tif (key != 'att') {\n\t\t\t\t\t\t\t\tbreak;\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\t\t\t\t\tif (key == 'php_met') {\n\t\t\t\t\t\tthis.last_class = (k_link && !/^(self|parent|static|dir)\$/i.test(link) ? link : '');\n\t\t\t\t\t}\n\t\t\t\t\tif (k_link) {\n\t\t\t\t\t\ts = (m[1] ? '<span class=\"jush-op\">' + this.htmlspecialchars(escape ? escape(m[1]) : m[1]) + '</span>' : '');\n\t\t\t\t\t\ts += this.create_link(\n\t\t\t\t\t\t\t(/^https?:/.test(k_link) ? k_link : this.urls[key].replace(/\\\$key/, k_link))\n\t\t\t\t\t\t\t\t.replace(/\\\$val/, (/^https?:/.test(k_link) ? link.toLowerCase() : link))\n\t\t\t\t\t\t\t\t.replace(/\\\$tag/, this.last_tag),\n\t\t\t\t\t\t\tthis.htmlspecialchars(escape ? escape(m[2]) : m[2])); //! use jush.api\n\t\t\t\t\t\ts += (m[3] ? '<span class=\"jush-op\">' + this.htmlspecialchars(escape ? escape(m[3]) : m[3]) + '</span>' : '');\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t\tret.push('<span class=\"jush-' + key + '\">', s);\n\t\t\t\tstates.push(key);\n\t\t\t\tif (state == 'php_eot') {\n\t\t\t\t\tthis.tr.php_eot2._2 = new RegExp('(\\n)(' + match[1] + ')(;?\\n)');\n\t\t\t\t\tthis.build_regexp('php_eot2', (match[2] == \"'\" ? { _2: this.tr.php_eot2._2 } : this.tr.php_eot2));\n\t\t\t\t} else if (state == 'pgsql_eot') {\n\t\t\t\t\tthis.tr.pgsql_eot2._2 = new RegExp('\\\\\$' + match[0].replace(/\\\$/, '\\\\\$'));\n\t\t\t\t\tthis.build_regexp('pgsql_eot2', this.tr.pgsql_eot2);\n\t\t\t\t}\n\t\t\t} else {\n\t\t\t\tif (state == 'php_met' && this.last_class) {\n\t\t\t\t\tvar title = (jush.api['php2'] ? jush.api['php2'][(this.last_class + '::' + s).toLowerCase()] : '');\n\t\t\t\t\ts = this.create_link(this.urls[state].replace(/\\\$key/, this.last_class) + '.' + s.toLowerCase(), s, (title ? ' title=\"' + this.htmlspecialchars_quo(title) + '\"' : ''));\n\t\t\t\t}\n\t\t\t\tret.push(s);\n\t\t\t\tfor (var i = Math.min(states.length, +key.substr(1)); i--; ) {\n\t\t\t\t\tret.push('</span>');\n\t\t\t\t\tstates.pop();\n\t\t\t\t}\n\t\t\t}\n\t\t\tstart = match.index + match[0].length;\n\t\t\tif (!states.length) { // out of states\n\t\t\t\tbreak;\n\t\t\t}\n\t\t\tstate = states[states.length - 1];\n\t\t\tthis.regexps[state].lastIndex = start;\n\t\t}\n\t\tret.push(this.keywords_links(state, this.htmlspecialchars(text.substring(start))));\n\t\tfor (var i=1; i < states.length; i++) {\n\t\t\tret.push('</span>');\n\t\t}\n\t\tstates.shift();\n\t\treturn [ ret.join(''), states ];\n\t},\n\n\t/** Replace <&> by HTML entities\n\t* @param string\n\t* @return string\n\t*/\n\thtmlspecialchars: function (string) {\n\t\treturn string.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');\n\t},\n\n\thtmlspecialchars_quo: function (string) {\n\t\treturn jush.htmlspecialchars(string).replace(/\"/g, '&quot;'); // jush - this.htmlspecialchars_quo is passed as reference\n\t},\n\n\thtmlspecialchars_apo: function (string) {\n\t\treturn jush.htmlspecialchars(string).replace(/'/g, '&#39;');\n\t},\n\n\thtmlspecialchars_quo_apo: function (string) {\n\t\treturn jush.htmlspecialchars_quo(string).replace(/'/g, '&#39;');\n\t},\n\n\t/** Decode HTML entities\n\t* @param string\n\t* @return string\n\t*/\n\thtml_entity_decode: function (string) {\n\t\treturn string.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '\"').replace(/&nbsp;/g, '\\u00A0').replace(/&#(?:([0-9]+)|x([0-9a-f]+));/gi, function (str, p1, p2) { //! named entities\n\t\t\treturn String.fromCharCode(p1 ? p1 : parseInt(p2, 16));\n\t\t}).replace(/&amp;/g, '&');\n\t},\n\n\t/** Add backslash before backslash\n\t* @param string\n\t* @return string\n\t*/\n\taddslashes: function (string) {\n\t\treturn string.replace(/\\\\/g, '\\\\\$&');\n\t},\n\n\taddslashes_apo: function (string) {\n\t\treturn string.replace(/[\\\\']/g, '\\\\\$&');\n\t},\n\n\taddslashes_quo: function (string) {\n\t\treturn string.replace(/[\\\\\"]/g, '\\\\\$&');\n\t},\n\n\t/** Remove backslash before \\\"'\n\t* @param string\n\t* @return string\n\t*/\n\tstripslashes: function (string) {\n\t\treturn string.replace(/\\\\([\\\\\"'])/g, '\$1');\n\t}\n};\n\n\n\njush.tr = { // transitions - key: go inside this state, _2: go outside 2 levels (number alone is put to the beginning in Chrome)\n\t// regular expressions matching empty string could be used only in the last key\n\tquo: { php: jush.php, esc: /\\\\/, _1: /\"/ },\n\tapo: { php: jush.php, esc: /\\\\/, _1: /'/ },\n\tcom: { php: jush.php, _1: /\\*\\// },\n\tcom_nest: { com_nest: /\\/\\*/, _1: /\\*\\// },\n\tphp: { _1: /\\?>/ }, // overwritten by jush-php.js\n\tesc: { _1: /./ }, //! php_quo allows [0-7]{1,3} and x[0-9A-Fa-f]{1,2}\n\tone: { _1: /(?=\\n)/ },\n\tnum: { _1: /()/ },\n\n\tsql_apo: { esc: /\\\\/, _0: /''/, _1: /'/ },\n\tsql_quo: { esc: /\\\\/, _0: /\"\"/, _1: /\"/ },\n\tsql_var: { _1: /(?=[^_.\$a-zA-Z0-9])/ },\n\tsqlite_apo: { _0: /''/, _1: /'/ },\n\tsqlite_quo: { _0: /\"\"/, _1: /\"/ },\n\tbac: { _1: /`/ },\n\tbra: { _1: /]/ }\n};\n\n// string: \$key stands for key in jush.links, \$val stands for found string\n// array: [0] is base, other elements correspond to () in jush.links2, \$key stands for text of selected element, \$1 stands for found string\njush.urls = { };\njush.links = { };\njush.links2 = { }; // first and last () is used as delimiter\n/** Get callback for autocompletition\n* @param string escaped empty identifier, e.g. `` for MySQL or [] for MS SQL\n* @param Object<string, Array<string>> keys are table names, values are lists of columns\n* @return Function see autocomplete()\n*/\njush.autocompleteSql = function (esc, tablesColumns) {\n\t/**\n\t* key: regular expression; ' ' will be expanded to '\\\\s+', '\\\\w' to esc[0]+'?\\\\w'+esc[1]+'?', '\$' will be appended\n\t* value: list of autocomplete words; '?' means to not use the word if it's already in the current query\n\t*/\n\tconst keywordsDefault = {\n\t\t'^': ['SELECT', 'INSERT INTO', 'UPDATE', 'DELETE FROM', 'EXPLAIN'],\n\t\t'^EXPLAIN ': ['SELECT'],\n\t\t'^INSERT ': ['IGNORE'],\n\t\t'^INSERT .+\\\\) ': ['?VALUES', 'ON DUPLICATE KEY UPDATE'],\n\t\t'^UPDATE \\\\w+ ': ['SET'],\n\t\t'^UPDATE \\\\w+ SET .+ ': ['?WHERE'],\n\t\t'^DELETE FROM \\\\w+ ': ['WHERE'],\n\t\t' JOIN \\\\w+(( AS)? (?!(ON|USING|AS) )\\\\w+)? ': ['ON', 'USING'],\n\t\t'\\\\bSELECT ': ['*', 'DISTINCT'],\n\t\t'\\\\bSELECT .+ ': ['?FROM'],\n\t\t'\\\\bSELECT (?!.* (WHERE|GROUP BY|HAVING|ORDER BY|LIMIT) ).+ FROM .+ ': ['INNER JOIN', 'LEFT JOIN', '?WHERE'],\n\t\t'\\\\bSELECT (?!.* (HAVING|ORDER BY|LIMIT|OFFSET) ).+ FROM .+ ': ['?GROUP BY'],\n\t\t'\\\\bSELECT (?!.* (ORDER BY|LIMIT|OFFSET) ).+ FROM .+ ': ['?HAVING'],\n\t\t'\\\\bSELECT (?!.* (LIMIT|OFFSET) ).+ FROM .+ ': ['?ORDER BY'], // this matches prefixes without LIMIT|OFFSET and offers ORDER BY if it's not already used in prefix or suffix\n\t\t'\\\\bSELECT (?!.* (OFFSET) ).+ FROM .+ ': ['?LIMIT', '?OFFSET'],\n\t\t' ORDER BY (?!.* (LIMIT|OFFSET) ).+ ': ['DESC'],\n\t};\n\t\n\t/** Get list of strings for autocompletion\n\t* @param string\n\t* @param string\n\t* @param string\n\t* @return Object<string, number> keys are words, values are offsets\n\t*/\n\tfunction autocomplete(state, before, after) {\n\t\tif (/^(one|com|sql_apo|sqlite_apo)\$/.test(state)) {\n\t\t\treturn {};\n\t\t}\n\t\tbefore = before\n\t\t\t.replace(/\\/\\*.*?\\*\\/|\\s--[^\\n]*|'[^']+'/s, '') // strip comments and strings\n\t\t\t.replace(/.*;/s, '') // strip previous query\n\t\t\t.trimStart()\n\t\t;\n\t\tafter = after.replace(/;.*/s, ''); // strip next query\n\t\tconst query = before + after;\n\t\tconst allTables = Object.keys(tablesColumns);\n\t\tconst usedTables = findTables(query); // tables used by the current query\n\t\tconst uniqueColumns = {};\n\t\tfor (const table of Object.values(usedTables)) {\n\t\t\tfor (const column of tablesColumns[table]) {\n\t\t\t\tuniqueColumns[column] = 0;\n\t\t\t}\n\t\t}\n\t\tconst columns = Object.keys(uniqueColumns);\n\t\tif (columns.length > 50) {\n\t\t\tcolumns.length = 0;\n\t\t}\n\t\tif (Object.keys(usedTables).length > 1) {\n\t\t\tfor (const alias in usedTables) {\n\t\t\t\tcolumns.push(alias + '.');\n\t\t\t}\n\t\t}\n\t\t\n\t\tconst preferred = {\n\t\t\t'\\\\b(FROM|INTO|^UPDATE|JOIN) ': allTables, // all tables including the current ones (self-join)\n\t\t\t'\\\\b(^INSERT|USING) [^(]*\\\\(([^)]+, )?': columns, // offer columns right after '(' or after ','\n\t\t\t'(^UPDATE .+ SET| DUPLICATE KEY UPDATE| BY) (.+, )?': columns,\n\t\t\t' (WHERE|HAVING|AND|OR|ON|=) ': columns,\n\t\t};\n\t\tkeywordsDefault['\\\\bSELECT( DISTINCT)? (?!.* FROM )(.+, )?'] = columns; // this is not in preferred because we prefer '*'\n\t\t\n\t\tconst context = before.replace(escRe('[\\\\w`]+\$'), ''); // in 'UPDATE tab.`co', context is 'UPDATE tab.'\n\t\tbefore = before.replace(escRe('.*[^\\\\w`]', 's'), ''); // in 'UPDATE tab.`co', before is '`co'\n\t\t\n\t\tconst thisColumns = []; // columns in the current table ('table.')\n\t\tconst match = context.match(escRe('`?(\\\\w+)`?\\\\.\$'));\n\t\tif (match) {\n\t\t\tlet table = match[1];\n\t\t\tif (!tablesColumns[table]) {\n\t\t\t\ttable = usedTables[table];\n\t\t\t}\n\t\t\tif (tablesColumns[table]) {\n\t\t\t\tthisColumns.push(...tablesColumns[table]);\n\t\t\t\tpreferred['\\\\.'] = thisColumns;\n\t\t\t}\n\t\t}\n\n\t\tif (query.includes(esc[0]) && !/^\\w/.test(before)) { // if there's any ` in the query, use ` everywhere unless the user starts typing letters\n\t\t\tallTables.forEach(addEsc);\n\t\t\tcolumns.forEach(addEsc);\n\t\t\tthisColumns.forEach(addEsc);\n\t\t}\n\t\t\n\t\tconst ac = {};\n\t\tfor (const keywords of [preferred, keywordsDefault]) {\n\t\t\tfor (const re in keywords) {\n\t\t\t\tif (context.match(escRe(re.replace(/ /g, '\\\\s+').replace(/\\\\w\\+/g, '`?\\\\w+`?') + '\$', 'is'))) {\n\t\t\t\t\tfor (let keyword of keywords[re]) {\n\t\t\t\t\t\tif (keyword[0] == '?') {\n\t\t\t\t\t\t\tkeyword = keyword.substring(1);\n\t\t\t\t\t\t\tif (query.match(new RegExp('\\\\s+' + keyword + '\\\\s+', 'i'))) {\n\t\t\t\t\t\t\t\tcontinue;\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t}\n\t\t\t\t\t\tif (keyword.length > before.length && keyword.toUpperCase().startsWith(before.toUpperCase())) {\n\t\t\t\t\t\t\tconst isCol = (keywords[re] == columns || keywords[re] == thisColumns);\n\t\t\t\t\t\t\tac[keyword + (isCol ? '' : ' ')] = before.length;\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t\t\n\t\treturn ac;\n\t}\n\t\n\tfunction addEsc(val, key, array) {\n\t\tarray[key] = esc[0] + val.replace(/\\.?\$/, esc[1] + '\$&');\n\t}\n\n\t/** Change odd ` to esc[0], even to esc[1] */\n\tfunction escRe(re, flags) {\n\t\tlet i = 0;\n\t\treturn new RegExp(re.replace(/`/g, () => (esc[0] == '[' ? '\\\\' : '') + esc[i++ % 2]), flags);\n\t}\n\n\t/** @return Object<string, string> key is alias, value is actual table */\n\tfunction findTables(query) {\n\t\tconst matches = query.matchAll(escRe('\\\\b(FROM|JOIN|INTO|UPDATE)\\\\s+(\\\\w+|`.+?`)((\\\\s+AS)?\\\\s+((?!(LEFT|INNER|JOIN|ON|USING|WHERE|GROUP|HAVING|ORDER|LIMIT)\\\\b)\\\\w+|`.+?`))?', 'gi')); //! handle `abc``def`\n\t\tconst result = {};\n\t\tfor (const match of matches) {\n\t\t\tconst table = match[2].replace(escRe('^`|`\$', 'g'), '');\n\t\t\tconst alias = (match[5] ? match[5].replace(escRe('^`|`\$', 'g'), '') : table);\n\t\t\tif (tablesColumns[table]) {\n\t\t\t\tresult[alias] = table;\n\t\t\t}\n\t\t}\n\t\tif (!Object.keys(result).length) {\n\t\t\tfor (const table in tablesColumns) {\n\t\t\t\tresult[table] = table;\n\t\t\t}\n\t\t}\n\t\treturn result;\n\t}\n\n\t// we open the autocomplete on word character, space, '(', '.' and '`'; textarea also triggers it on Backspace and Ctrl+Space\n\tautocomplete.openBy = escRe('^[\\\\w`(. ]\$'); //! ignore . in 1.23\n\n\treturn autocomplete;\n};\njush.textarea = (function () {\n\t//! IE sometimes inserts empty <p> in start of a string when newline is entered inside\n\t\n\tfunction findSelPos(pre) {\n\t\tvar sel = getSelection();\n\t\tif (sel.rangeCount) {\n\t\t\tvar range = sel.getRangeAt(0);\n\t\t\treturn findPosition(pre, range.startContainer, range.startOffset);\n\t\t}\n\t}\n\n\tfunction findPosition(el, container, offset) {\n\t\tvar pos = { pos: 0 };\n\t\tfindPositionRecurse(el, container, offset, pos);\n\t\treturn pos.pos;\n\t}\n\n\tfunction findPositionRecurse(child, container, offset, pos) {\n\t\tif (child.nodeType == 3) {\n\t\t\tif (child == container) {\n\t\t\t\tpos.pos += offset;\n\t\t\t\treturn true;\n\t\t\t}\n\t\t\tpos.pos += child.textContent.length;\n\t\t} else if (child == container) {\n\t\t\tfor (var i = 0; i < offset; i++) {\n\t\t\t\tfindPositionRecurse(child.childNodes[i], container, offset, pos);\n\t\t\t}\n\t\t\treturn true;\n\t\t} else {\n\t\t\tif (/^(br|div)\$/i.test(child.tagName)) {\n\t\t\t\tpos.pos++;\n\t\t\t}\n\t\t\tfor (var i = 0; i < child.childNodes.length; i++) {\n\t\t\t\tif (findPositionRecurse(child.childNodes[i], container, offset, pos)) {\n\t\t\t\t\treturn true;\n\t\t\t\t}\n\t\t\t}\n\t\t\tif (/^p\$/i.test(child.tagName)) {\n\t\t\t\tpos.pos++;\n\t\t\t}\n\t\t}\n\t}\n\t\n\tfunction findOffset(el, pos) {\n\t\treturn findOffsetRecurse(el, { pos: pos });\n\t}\n\t\n\tfunction findOffsetRecurse(child, pos) {\n\t\tif (child.nodeType == 3) { // 3 - TEXT_NODE\n\t\t\tif (child.textContent.length >= pos.pos) {\n\t\t\t\treturn { container: child, offset: pos.pos };\n\t\t\t}\n\t\t\tpos.pos -= child.textContent.length;\n\t\t} else {\n\t\t\tfor (var i = 0; i < child.childNodes.length; i++) {\n\t\t\t\tif (/^br\$/i.test(child.childNodes[i].tagName)) {\n\t\t\t\t\tif (!pos.pos) {\n\t\t\t\t\t\treturn { container: child, offset: i };\n\t\t\t\t\t}\n\t\t\t\t\tpos.pos--;\n\t\t\t\t\tif (!pos.pos && i == child.childNodes.length - 1) { // last invisible <br>\n\t\t\t\t\t\treturn { container: child, offset: i };\n\t\t\t\t\t}\n\t\t\t\t} else {\n\t\t\t\t\tvar result = findOffsetRecurse(child.childNodes[i], pos);\n\t\t\t\t\tif (result) {\n\t\t\t\t\t\treturn result;\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n\t\n\tfunction setSelPos(pre, pos) {\n\t\tif (pos) {\n\t\t\tvar start = findOffset(pre, pos);\n\t\t\tif (start) {\n\t\t\t\tvar range = document.createRange();\n\t\t\t\trange.setStart(start.container, start.offset);\n\t\t\t\tvar sel = getSelection();\n\t\t\t\tsel.removeAllRanges();\n\t\t\t\tsel.addRange(range);\n\t\t\t}\n\t\t}\n\t}\n\n\tfunction setText(pre, text, end) {\n\t\tvar lang = 'txt';\n\t\tif (text.length < 1e4) { // highlighting is slow with most languages\n\t\t\tvar match = /(^|\\s)(?:jush|language)-(\\S+)/.exec(pre.jushTextarea.className);\n\t\t\tlang = (match ? match[2] : 'htm');\n\t\t}\n\t\tvar html = jush.highlight(lang, text).replace(/\\n/g, '<br>');\n\t\tsetHTML(pre, html, text, end);\n\t\tif (openAc) {\n\t\t\topenAutocomplete(pre);\n\t\t\topenAc = false;\n\t\t} else {\n\t\t\tcloseAutocomplete();\n\t\t}\n\t}\n\t\n\tfunction setHTML(pre, html, text, pos) {\n\t\tpre.innerHTML = html;\n\t\tpre.lastHTML = pre.innerHTML; // not html because IE reformats the string\n\t\tpre.jushTextarea.value = text;\n\t\tsetSelPos(pre, pos);\n\t}\n\t\n\tfunction keydown(event) {\n\t\tconst ctrl = (event.ctrlKey || event.metaKey);\n\t\tif (!event.altKey) {\n\t\t\tif (!ctrl && acEl.options.length) {\n\t\t\t\tconst select =\n\t\t\t\t\t(event.key == 'ArrowDown' ? Math.min(acEl.options.length - 1, acEl.selectedIndex + 1) :\n\t\t\t\t\t(event.key == 'ArrowUp' ? Math.max(0, acEl.selectedIndex - 1) :\n\t\t\t\t\t(event.key == 'PageDown' ? Math.min(acEl.options.length - 1, acEl.selectedIndex + acEl.size) :\n\t\t\t\t\t(event.key == 'PageUp' ? Math.max(0, acEl.selectedIndex - acEl.size) :\n\t\t\t\t\tnull))))\n\t\t\t\t;\n\t\t\t\tif (select !== null) {\n\t\t\t\t\tacEl.selectedIndex = select;\n\t\t\t\t\treturn false;\n\t\t\t\t}\n\t\t\t\tif (/^(Enter|Tab)\$/.test(event.key) && !event.shiftKey) {\n\t\t\t\t\tinsertAutocomplete(this);\n\t\t\t\t\treturn false;\n\t\t\t\t}\n\t\t\t}\n\t\t\t\n\t\t\tif (ctrl) {\n\t\t\t\tif (event.key == ' ') {\n\t\t\t\t\topenAutocomplete(this);\n\t\t\t\t}\n\t\t\t} else if (autocomplete.openBy && (autocomplete.openBy.test(event.key) || event.key == 'Backspace' || (event.key == 'Enter' && event.shiftKey))) {\n\t\t\t\topenAc = true;\n\t\t\t} else if (/^(Escape|ArrowLeft|ArrowRight|Home|End)\$/.test(event.key)) {\n\t\t\t\tcloseAutocomplete();\n\t\t\t}\n\t\t}\n\t\t\n\t\tif (ctrl && !event.altKey) {\n\t\t\tvar isUndo = (event.keyCode == 90); // 90 - z\n\t\t\tvar isRedo = (event.keyCode == 89 || (event.keyCode == 90 && event.shiftKey)); // 89 - y\n\t\t\tif (isUndo || isRedo) {\n\t\t\t\tif (isRedo) {\n\t\t\t\t\tif (this.jushUndoPos + 1 < this.jushUndo.length) {\n\t\t\t\t\t\tthis.jushUndoPos++;\n\t\t\t\t\t\tvar undo = this.jushUndo[this.jushUndoPos];\n\t\t\t\t\t\tsetText(this, undo.text, undo.end)\n\t\t\t\t\t}\n\t\t\t\t} else if (this.jushUndoPos >= 0) {\n\t\t\t\t\tthis.jushUndoPos--;\n\t\t\t\t\tvar undo = this.jushUndo[this.jushUndoPos] || { html: '', text: '' };\n\t\t\t\t\tsetText(this, undo.text, this.jushUndo[this.jushUndoPos + 1].start);\n\t\t\t\t}\n\t\t\t\treturn false;\n\t\t\t}\n\t\t} else {\n\t\t\tsetLastPos(this);\n\t\t}\n\t}\n\t\n\tconst maxSize = 8;\n\tconst acEl = document.createElement('select');\n\tacEl.size = maxSize;\n\tacEl.className = 'jush-autocomplete';\n\tacEl.style.position = 'absolute';\n\tacEl.style.zIndex = 1;\n\tacEl.onclick = () => {\n\t\tinsertAutocomplete(pre);\n\t};\n\topenAc = false;\n\tcloseAutocomplete();\n\n\tfunction findState(node) {\n\t\tlet match;\n\t\twhile (node && (!/^(CODE|PRE)\$/.test(node.tagName) || !(match = node.className.match(/(^|\\s)jush-(\\w+)/)))) {\n\t\t\tnode = node.parentElement;\n\t\t}\n\t\treturn (match ? match[2] : '');\n\t}\n\n\tfunction openAutocomplete(pre) {\n\t\tconst prevSelected = acEl.options[acEl.selectedIndex];\n\t\tcloseAutocomplete();\n\t\tconst sel = getSelection();\n\t\tif (sel.rangeCount) {\n\t\t\tconst range = sel.getRangeAt(0);\n\t\t\tconst pos = findSelPos(pre);\n\t\t\tconst state = findState(range.startContainer);\n\t\t\tif (state) {\n\t\t\t\tconst ac = autocomplete(\n\t\t\t\t\tstate,\n\t\t\t\t\tpre.innerText.substring(0, pos),\n\t\t\t\t\tpre.innerText.substring(pos)\n\t\t\t\t);\n\t\t\t\tif (Object.keys(ac).length) {\n\t\t\t\t\tlet select = 0;\n\t\t\t\t\tfor (const word in ac) {\n\t\t\t\t\t\tconst option = document.createElement('option');\n\t\t\t\t\t\toption.value = ac[word];\n\t\t\t\t\t\toption.textContent = word;\n\t\t\t\t\t\tacEl.append(option);\n\t\t\t\t\t\tif (prevSelected && prevSelected.textContent == word) {\n\t\t\t\t\t\t\tselect = acEl.options.length - 1;\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\t\t\t\t\tacEl.selectedIndex = select;\n\t\t\t\t\tacEl.size = Math.min(Math.max(acEl.options.length, 2), maxSize);\n\t\t\t\t\tpositionAutocomplete();\n\t\t\t\t\tacEl.style.display = '';\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n\t\n\tfunction positionAutocomplete() {\n\t\tconst sel = getSelection();\n\t\tif (sel.rangeCount && acEl.options.length) {\n\t\t\tconst pos = findSelPos(pre);\n\t\t\tconst range = sel.getRangeAt(0);\n\t\t\tconst range2 = range.cloneRange();\n\t\t\trange2.setStart(range.startContainer, Math.max(0, range.startOffset - acEl.options[0].value)); // autocompletions currently couldn't cross container boundary\n\t\t\tconst span = document.createElement('span'); // collapsed ranges have empty bounding rect\n\t\t\trange2.insertNode(span);\n\t\t\tacEl.style.left = span.offsetLeft + 'px';\n\t\t\tacEl.style.top = (span.offsetTop + 20) + 'px';\n\t\t\tspan.remove();\n\t\t\tsetSelPos(pre, pos); // required on iOS\n\t\t}\n\t}\n\t\n\tfunction closeAutocomplete() {\n\t\tacEl.options.length = 0;\n\t\tacEl.style.display = 'none';\n\t}\n\t\n\tfunction insertAutocomplete(pre) {\n\t\tconst sel = getSelection();\n\t\tconst range = sel.rangeCount && sel.getRangeAt(0);\n\t\tif (range) {\n\t\t\tconst insert = acEl.options[acEl.selectedIndex].textContent;\n\t\t\tconst offset = +acEl.options[acEl.selectedIndex].value;\n\t\t\tforceNewUndo = true;\n\t\t\tpre.lastPos = findSelPos(pre);\n\t\t\tconst start = findOffset(pre, pre.lastPos - offset);\n\t\t\tif (start) {\n\t\t\t\trange.setStart(start.container, start.offset);\n\t\t\t}\n\t\t\tdocument.execCommand('insertText', false, insert);\n\t\t\topenAutocomplete(pre);\n\t\t}\n\t}\n\t\n\tfunction setLastPos(pre) {\n\t\tif (pre.lastPos === undefined) {\n\t\t\tpre.lastPos = findSelPos(pre);\n\t\t}\n\t}\n\t\n\tvar forceNewUndo = true;\n\t\n\tfunction highlight(pre) {\n\t\tvar start = pre.lastPos;\n\t\tpre.lastPos = undefined;\n\t\tvar innerHTML = pre.innerHTML;\n\t\tif (innerHTML != pre.lastHTML) {\n\t\t\tvar end = findSelPos(pre);\n\t\t\tinnerHTML = innerHTML.replace(/<br>((<\\/[^>]+>)*<\\/?div>)(?!\$)/gi, function (all, rest) {\n\t\t\t\tif (end) {\n\t\t\t\t\tend--;\n\t\t\t\t}\n\t\t\t\treturn rest;\n\t\t\t});\n\t\t\tpre.innerHTML = innerHTML\n\t\t\t\t.replace(/<(br|div)\\b[^>]*>/gi, '\\n') // Firefox, Chrome\n\t\t\t\t.replace(/&nbsp;(<\\/[pP]\\b)/g, '\$1') // IE\n\t\t\t\t.replace(/<\\/p\\b[^>]*>(\$|<p\\b[^>]*>)/gi, '\\n') // IE\n\t\t\t\t.replace(/(&nbsp;)+\$/gm, '') // Chrome for some users\n\t\t\t;\n\t\t\tsetText(pre, pre.textContent.replace(/\\u00A0/g, ' '), end);\n\t\t\tpre.jushUndo.length = pre.jushUndoPos + 1;\n\t\t\tif (forceNewUndo || !pre.jushUndo.length || pre.jushUndo[pre.jushUndoPos].end !== start) {\n\t\t\t\tpre.jushUndo.push({ text: pre.jushTextarea.value, start: start, end: (forceNewUndo ? undefined : end) });\n\t\t\t\tpre.jushUndoPos++;\n\t\t\t\tforceNewUndo = false;\n\t\t\t} else {\n\t\t\t\tpre.jushUndo[pre.jushUndoPos].text = pre.jushTextarea.value;\n\t\t\t\tpre.jushUndo[pre.jushUndoPos].end = end;\n\t\t\t}\n\t\t}\n\t}\n\t\n\tfunction input() {\n\t\thighlight(this);\n\t}\n\t\n\tfunction paste(event) {\n\t\tif (event.clipboardData) {\n\t\t\tsetLastPos(this);\n\t\t\tif (document.execCommand('insertHTML', false, jush.htmlspecialchars(event.clipboardData.getData('text')))) { // Opera doesn't support insertText\n\t\t\t\tevent.preventDefault();\n\t\t\t}\n\t\t\tforceNewUndo = true; // highlighted in input\n\t\t}\n\t}\n\t\n\tfunction click(event) {\n\t\tif ((event.ctrlKey || event.metaKey) && event.target.href) {\n\t\t\topen(event.target.href);\n\t\t}\n\t\tcloseAutocomplete();\n\t}\n\t\n\tlet pre;\n\tlet autocomplete = () => ({});\n\taddEventListener('resize', positionAutocomplete);\n\t\n\treturn function textarea(el, autocompleter) {\n\t\tif (!window.getSelection) {\n\t\t\treturn;\n\t\t}\n\t\tif (autocompleter) {\n\t\t\tautocomplete = autocompleter;\n\t\t}\n\t\tpre = document.createElement('pre');\n\t\tpre.contentEditable = true;\n\t\tpre.className = el.className + ' jush';\n\t\tpre.style.border = '1px inset #ccc';\n\t\tpre.style.width = el.clientWidth + 'px';\n\t\tpre.style.height = el.clientHeight + 'px';\n\t\tpre.style.padding = '3px';\n\t\tpre.style.overflow = 'auto';\n\t\tpre.style.resize = 'both';\n\t\tif (el.wrap != 'off') {\n\t\t\tpre.style.whiteSpace = 'pre-wrap';\n\t\t}\n\t\tpre.jushTextarea = el;\n\t\tpre.jushUndo = [ ];\n\t\tpre.jushUndoPos = -1;\n\t\tpre.onkeydown = keydown;\n\t\tpre.oninput = input;\n\t\tpre.onpaste = paste;\n\t\tpre.onclick = click;\n\t\tpre.appendChild(document.createTextNode(el.value));\n\t\thighlight(pre);\n\t\tif (el.spellcheck === false) {\n\t\t\tpre.spellcheck = false;\n\t\t}\n\t\tel.before(pre);\n\t\tel.before(acEl);\n\t\tif (document.activeElement === el) {\n\t\t\tpre.focus();\n\t\t\tif (!el.value) {\n\t\t\t\topenAutocomplete(pre);\n\t\t\t}\n\t\t}\n\t\tacEl.style.font = getComputedStyle(pre).font;\n\t\tel.style.display = 'none';\n\t\treturn pre;\n\t};\n})();\njush.tr.txt = { php: jush.php };\njush.tr.js = { php: jush.php, js_reg: /\\s*\\/(?![\\/*])/, js_obj: /\\s*\\{/, _1: /}/, js_code: /()/ };\njush.tr.js_code = { php: jush.php, quo: /\"/, apo: /'/, js_bac: /`/, js_one: /\\/\\//, js_doc: /\\/\\*\\*/, com: /\\/\\*/, num: jush.num, js_write: /(\\b)(write(?:ln)?)(\\()/, js_http: /(\\.)(setRequestHeader|getResponseHeader)(\\()/, js: /\\{/, _3: /(<)(\\/script)(>)/i, _2: /}/, _1: /[^.\\])}\$\\w\\s]/ };\njush.tr.js_write = { php: jush.php, js_reg: /\\s*\\/(?![\\/*])/, js_write_code: /()/ };\njush.tr.js_http = { php: jush.php, js_reg: /\\s*\\/(?![\\/*])/, js_http_code: /()/ };\njush.tr.js_write_code = { php: jush.php, quo: /\"/, apo: /'/, js_bac: /`/, js_one: /\\/\\//, com: /\\/\\*/, num: jush.num, js_write: /\\(/, _2: /\\)/, _1: /[^\\])}\$\\w\\s]/ };\njush.tr.js_http_code = { php: jush.php, quo: /\"/, apo: /'/, js_bac: /`/, js_one: /\\/\\//, com: /\\/\\*/, num: jush.num, js_http: /\\(/, _2: /\\)/, _1: /[^\\])}\$\\w\\s]/ };\njush.tr.js_one = { php: jush.php, _1: /\\n/, _3: /(<)(\\/script)(>)/i };\njush.tr.js_reg = { php: jush.php, esc: /\\\\/, js_reg_bra: /\\[/, _1: /\\/[a-z]*/i }; //! highlight regexp\njush.tr.js_reg_bra = { php: jush.php, esc: /\\\\/, _1: /]/ };\njush.tr.js_doc = { _1: /\\*\\// };\njush.tr.js_arr = { php: jush.php, quo: /\"/, apo: /'/, js_bac: /`/, js_one: /\\/\\//, com: /\\/\\*/, num: jush.num, js_arr: /\\[/, js_obj: /\\{/, _1: /]/ };\njush.tr.js_obj = { php: jush.php, js_one: /\\s*\\/\\//, com: /\\s*\\/\\*/, js_val: /:/, _1: /\\s*}/, js_key: /()/ };\njush.tr.js_val = { php: jush.php, quo: /\"/, apo: /'/, js_bac: /`/, js_one: /\\/\\//, com: /\\/\\*/, num: jush.num, js_arr: /\\[/, js_obj: /\\{/, _1: /,|(?=})/ };\njush.tr.js_key = { php: jush.php, quo: /\"/, apo: /'/, js_bac: /`/, js_one: /\\/\\//, com: /\\/\\*/, num: jush.num, _1: /(?=[:}])/ };\njush.tr.js_bac = { php: jush.php, esc: /\\\\/, js: /\\\$\\{/, _1: /`/ };\n\njush.urls.js_write = 'https://developer.mozilla.org/en/docs/DOM/\$key.\$val';\njush.urls.js_http = 'https://www.w3.org/TR/XMLHttpRequest/#the-\$val-\$key';\njush.urls.js = ['https://developer.mozilla.org/en/\$key',\n\t'JavaScript/Reference/Global_Objects/\$1',\n\t'JavaScript/Reference/Statements/\$1',\n\t'JavaScript/Reference/Statements/do...while',\n\t'JavaScript/Reference/Statements/if...else',\n\t'JavaScript/Reference/Statements/try...catch',\n\t'JavaScript/Reference/Operators/Special/\$1',\n\t'DOM/document.\$1', 'DOM/element.\$1', 'DOM/event.\$1', 'DOM/form.\$1', 'DOM/table.\$1', 'DOM/window.\$1',\n\t'https://www.w3.org/TR/XMLHttpRequest/',\n\t'JavaScript/Reference/Global_Objects/Array.\$1',\n\t'JavaScript/Reference/Global_Objects/Array\$1',\n\t'JavaScript/Reference/Global_Objects/Date\$1',\n\t'JavaScript/Reference/Global_Objects/Function\$1',\n\t'JavaScript/Reference/Global_Objects/Number\$1',\n\t'JavaScript/Reference/Global_Objects/RegExp\$1',\n\t'JavaScript/Reference/Global_Objects/String\$1'\n];\njush.urls.js_doc = ['https://code.google.com/p/jsdoc-toolkit/wiki/Tag\$key',\n\t'\$1', 'Param', 'Augments', '\$1'\n];\n\njush.links.js_write = { 'document': /^(write|writeln)\$/ };\njush.links.js_http = { 'method': /^(setRequestHeader|getResponseHeader)\$/ };\n\njush.links2.js = /(\\b)(String\\.fromCharCode|Date\\.(?:parse|UTC)|Math\\.(?:E|LN2|LN10|LOG2E|LOG10E|PI|SQRT1_2|SQRT2|abs|acos|asin|atan|atan2|ceil|cos|exp|floor|log|max|min|pow|random|round|sin|sqrt|tan)|Array|Boolean|Date|Error|Function|JavaArray|JavaClass|JavaObject|JavaPackage|Math|Number|Object|Packages|RegExp|String|Infinity|JSON|NaN|undefined|Error|EvalError|RangeError|ReferenceError|SyntaxError|TypeError|URIError|decodeURI|decodeURIComponent|encodeURI|encodeURIComponent|eval|isFinite|isNaN|parseFloat|parseInt|(break|continue|for|function|return|switch|throw|var|while|with)|(do)|(if|else)|(try|catch|finally)|(delete|in|instanceof|new|this|typeof|void)|(alinkColor|anchors|applets|bgColor|body|characterSet|compatMode|contentType|cookie|defaultView|designMode|doctype|documentElement|domain|embeds|fgColor|forms|height|images|implementation|lastModified|linkColor|links|plugins|popupNode|referrer|styleSheets|title|tooltipNode|URL|vlinkColor|width|clear|createAttribute|createDocumentFragment|createElement|createElementNS|createEvent|createNSResolver|createRange|createTextNode|createTreeWalker|evaluate|execCommand|getElementById|getElementsByName|importNode|loadOverlay|queryCommandEnabled|queryCommandIndeterm|queryCommandState|queryCommandValue|write|writeln)|(attributes|childNodes|className|clientHeight|clientLeft|clientTop|clientWidth|dir|firstChild|id|innerHTML|lang|lastChild|localName|name|namespaceURI|nextSibling|nodeName|nodeType|nodeValue|offsetHeight|offsetLeft|offsetParent|offsetTop|offsetWidth|ownerDocument|parentNode|prefix|previousSibling|scrollHeight|scrollLeft|scrollTop|scrollWidth|style|tabIndex|tagName|textContent|addEventListener|appendChild|blur|click|cloneNode|dispatchEvent|focus|getAttribute|getAttributeNS|getAttributeNode|getAttributeNodeNS|getElementsByTagName|getElementsByTagNameNS|hasAttribute|hasAttributeNS|hasAttributes|hasChildNodes|insertBefore|item|normalize|removeAttribute|removeAttributeNS|removeAttributeNode|removeChild|removeEventListener|replaceChild|scrollIntoView|setAttribute|setAttributeNS|setAttributeNode|setAttributeNodeNS|supports|onblur|onchange|onclick|ondblclick|onfocus|onkeydown|onkeypress|onkeyup|onmousedown|onmousemove|onmouseout|onmouseover|onmouseup|onresize)|(altKey|bubbles|button|cancelBubble|cancelable|clientX|clientY|ctrlKey|currentTarget|detail|eventPhase|explicitOriginalTarget|isChar|layerX|layerY|metaKey|originalTarget|pageX|pageY|relatedTarget|screenX|screenY|shiftKey|target|timeStamp|type|view|which|initEvent|initKeyEvent|initMouseEvent|initUIEvent|stopPropagation|preventDefault)|(elements|name|acceptCharset|action|enctype|encoding|method|submit|reset)|(caption|tHead|tFoot|rows|tBodies|align|bgColor|border|cellPadding|cellSpacing|frame|rules|summary|width|createTHead|deleteTHead|createTFoot|deleteTFoot|createCaption|deleteCaption|insertRow|deleteRow)|(content|closed|controllers|crypto|defaultStatus|directories|document|frameElement|frames|history|innerHeight|innerWidth|location|locationbar|menubar|name|navigator|opener|outerHeight|outerWidth|pageXOffset|pageYOffset|parent|personalbar|pkcs11|screen|availTop|availLeft|availHeight|availWidth|colorDepth|height|left|pixelDepth|top|width|scrollbars|scrollMaxX|scrollMaxY|scrollX|scrollY|self|sidebar|status|statusbar|toolbar|window|alert|atob|back|btoa|captureEvents|clearInterval|clearTimeout|close|confirm|dump|escape|find|forward|getAttention|getComputedStyle|getSelection|home|moveBy|moveTo|open|openDialog|print|prompt|releaseEvents|resizeBy|resizeTo|scroll|scrollBy|scrollByLines|scrollByPages|scrollTo|setInterval|setTimeout|sizeToContent|stop|unescape|updateCommands|onabort|onclose|ondragdrop|onerror|onload|onpaint|onreset|onscroll|onselect|onsubmit|onunload)|(XMLHttpRequest)|(length))\\b|(\\.(?:pop|push|reverse|shift|sort|splice|unshift|concat|join|slice)|(\\.(?:getDate|getDay|getFullYear|getHours|getMilliseconds|getMinutes|getMonth|getSeconds|getTime|getTimezoneOffset|getUTCDate|getUTCDay|getUTCFullYear|getUTCHours|getUTCMilliseconds|getUTCMinutes|getUTCMonth|getUTCSeconds|setDate|setFullYear|setHours|setMilliseconds|setMinutes|setMonth|setSeconds|setTime|setUTCDate|setUTCFullYear|setUTCHours|setUTCMilliseconds|setUTCMinutes|setUTCMonth|setUTCSeconds|toDateString|toLocaleDateString|toLocaleTimeString|toTimeString|toUTCString))|(\\.(?:apply|call))|(\\.(?:toExponential|toFixed|toPrecision))|(\\.(?:exec|test))|(\\.(?:charAt|charCodeAt|concat|indexOf|lastIndexOf|localeCompare|match|replace|search|slice|split|substr|substring|toLocaleLowerCase|toLocaleUpperCase|toLowerCase|toUpperCase)))(\\s*\\(|\$)/g; // collisions: bgColor, height, width, length, name\njush.links2.js_doc = /(^[ \\t]*|\\n\\s*\\*\\s*|(?={))(@(?:augments|author|borrows|class|constant|constructor|constructs|default|deprecated|description|event|example|field|fileOverview|function|ignore|inner|lends|memberOf|name|namespace|param|private|property|public|requires|returns|see|since|static|throws|type|version)|(@argument)|(@extends)|(\\{@link))(\\b)/g;\njush.tr.sql = { one: /-- |#|--(?=\\n|\$)/, com_code: /\\/\\*![0-9]*|\\*\\//, com: /\\/\\*/, sql_sqlset: /(\\s*)(SET)(\\s+|\$)(?!NAMES\\b|CHARACTER\\b|PASSWORD\\b|(?:GLOBAL\\s+|SESSION\\s+)?TRANSACTION\\b|@[^@]|NEW\\.|OLD\\.)/i, sql_code: /()/ };\njush.tr.sql_code = { sql_apo: /'/, sql_quo: /\"/, bac: /`/, one: /-- |#|--(?=\\n|\$)/, com_code: /\\/\\*![0-9]*|\\*\\//, com: /\\/\\*/, sql_var: /\\B@/, num: jush.num, _1: /;|\\b(THEN|ELSE|LOOP|REPEAT|DO)\\b/i };\njush.tr.sql_sqlset = { one: /-- |#|--(?=\\n|\$)/, com: /\\/\\*/, sqlset_val: /=/, _1: /;|\$/ };\njush.tr.sqlset_val = { sql_apo: /'/, sql_quo: /\"/, bac: /`/, one: /-- |#|--(?=\\n|\$)/, com: /\\/\\*/, _1: /,/, _2: /;|\$/, num: jush.num }; //! comma can be inside function call\njush.tr.sqlset = { _0: /\$/ }; //! jump from SHOW VARIABLES LIKE ''\njush.tr.sqlstatus = { _0: /\$/ }; //! jump from SHOW STATUS LIKE ''\njush.tr.com_code = { _1: /()/ };\n\njush.urls.sql_sqlset = 'https://dev.mysql.com/doc/mysql/en/\$key';\njush.urls.sql = ['https://dev.mysql.com/doc/mysql/en/\$key',\n\t'alter-event.html', 'alter-table.html', 'alter-view.html', 'analyze-table.html', 'create-event.html', 'create-function.html', 'create-procedure.html', 'create-index.html', 'create-table.html', 'create-trigger.html', 'create-view.html', 'drop-index.html', 'drop-table.html', 'begin-end.html', 'optimize-table.html', 'repair-table.html', 'set-transaction.html', 'show-columns.html', 'show-engines.html', 'show-index.html', 'show-processlist.html', 'show-status.html', 'show-tables.html', 'show-variables.html',\n\t'\$1.html', '\$1-statement.html', 'if-statement.html', 'repeat-statement.html', 'truncate-table.html', 'commit.html', 'savepoints.html', 'lock-tables.html', 'charset-connection.html', 'insert-on-duplicate.html', 'fulltext-search.html', 'example-auto-increment.html',\n\t'comparison-operators.html#operator_\$1', 'comparison-operators.html#function_\$1', 'any-in-some-subqueries.html', 'all-subqueries.html', 'exists-and-not-exists-subqueries.html', 'group-by-modifiers.html', 'string-functions.html#operator_\$1', 'string-comparison-functions.html#operator_\$1', 'regexp.html#operator_\$1', 'regexp.html#operator_regexp', 'logical-operators.html#operator_\$1', 'control-flow-functions.html#operator_\$1', 'arithmetic-functions.html#operator_\$1', 'cast-functions.html#operator_\$1', 'date-and-time-functions.html#function_\$1', 'date-and-time-functions.html#function_date-add',\n\t'', // keywords without link\n\t'numeric-type-syntax.html', 'date-and-time-type-syntax.html', 'string-type-syntax.html', 'mysql-spatial-datatypes.html',\n\t'mathematical-functions.html#function_\$1', 'information-functions.html#function_\$1',\n\t'\$1-storage-engine.html', 'merge-storage-engine.html',\n\t'partitioning-range.html', 'partitioning-list.html', 'partitioning-columns.html', 'partitioning-hash.html', 'partitioning-linear-hash.html', 'partitioning-key.html',\n\t'comparison-operators.html#function_\$1', 'control-flow-functions.html#function_\$1', 'string-functions.html#function_\$1', 'string-comparison-functions.html#function_\$1', 'mathematical-functions.html#function_\$1', 'date-and-time-functions.html#function_\$1', 'cast-functions.html#function_\$1', 'xml-functions.html#function_\$1', 'bit-functions.html#function_\$1', 'encryption-functions.html#function_\$1', 'information-functions.html#function_\$1', 'miscellaneous-functions.html#function_\$1', 'group-by-functions.html#function_\$1',\n\t'functions-to-convert-geometries-between-formats.html#function_asbinary',\n\t'functions-to-convert-geometries-between-formats.html#function_astext',\n\t'functions-for-testing-spatial-relations-between-geometric-objects.html#function_\$1',\n\t'functions-that-create-new-geometries-from-existing-ones.html#function_\$1',\n\t'geometry-property-functions.html#function_\$1',\n\t'gis-wkt-functions.html#function_st-\$1',\n\t'row-subqueries.html',\n\t'fulltext-search.html#function_match'\n];\njush.urls.sqlset = ['https://dev.mysql.com/doc/mysql/en/\$key',\n\t'innodb-parameters.html#sysvar_\$1',\n\t'mysql-cluster-program-options-mysqld.html#option_mysqld_\$1', 'mysql-cluster-replication-conflict-resolution.html#option_mysqld_\$1', 'mysql-cluster-replication-schema.html', 'mysql-cluster-replication-starting.html', 'mysql-cluster-system-variables.html#sysvar_\$1',\n\t'replication-options-binary-log.html#option_mysqld_\$1', 'replication-options-binary-log.html#sysvar_\$1', 'replication-options-master.html#sysvar_\$1', 'replication-options-slave.html#option_mysqld_log-slave-updates', 'replication-options-slave.html#option_mysqld_\$1', 'replication-options-slave.html#sysvar_\$1', 'replication-options.html#option_mysqld_\$1',\n\t'server-options.html#option_mysqld_big-tables', 'server-options.html#option_mysqld_\$1',\n\t'server-system-variables.html#sysvar_\$1', // previously server-session-variables\n\t'server-system-variables.html#sysvar_low_priority_updates', 'server-system-variables.html#sysvar_max_join_size', 'server-system-variables.html#sysvar_\$1',\n\t'ssl-options.html#option_general_\$1'\n];\njush.urls.sqlstatus = ['https://dev.mysql.com/doc/mysql/en/\$key',\n\t'server-status-variables.html#statvar_Com_xxx',\n\t'server-status-variables.html#statvar_\$1'\n];\n\njush.links.sql_sqlset = { 'set-statement.html': /.+/ };\n\njush.links2.sql = /(\\b)(ALTER(?:\\s+DEFINER\\s*=\\s*\\S+)?\\s+EVENT|(ALTER(?:\\s+ONLINE|\\s+OFFLINE)?(?:\\s+IGNORE)?\\s+TABLE)|(ALTER(?:\\s+ALGORITHM\\s*=\\s*(?:UNDEFINED|MERGE|TEMPTABLE))?(?:\\s+DEFINER\\s*=\\s*\\S+)?(?:\\s+SQL\\s+SECURITY\\s+(?:DEFINER|INVOKER))?\\s+VIEW)|(ANALYZE(?:\\s+NO_WRITE_TO_BINLOG|\\s+LOCAL)?\\s+TABLE)|(CREATE(?:\\s+DEFINER\\s*=\\s*\\S+)?\\s+EVENT)|(CREATE(?:\\s+DEFINER\\s*=\\s*\\S+)?\\s+FUNCTION)|(CREATE(?:\\s+DEFINER\\s*=\\s*\\S+)?\\s+PROCEDURE)|(CREATE(?:\\s+ONLINE|\\s+OFFLINE)?(?:\\s+UNIQUE|\\s+FULLTEXT|\\s+SPATIAL)?\\s+INDEX)|(CREATE(?:\\s+TEMPORARY)?\\s+TABLE)|(CREATE(?:\\s+DEFINER\\s*=\\s*\\S+)?\\s+TRIGGER)|(CREATE(?:\\s+OR\\s+REPLACE)?(?:\\s+ALGORITHM\\s*=\\s*(?:UNDEFINED|MERGE|TEMPTABLE))?(?:\\s+DEFINER\\s*=\\s*\\S+)?(?:\\s+SQL\\s+SECURITY\\s+(?:DEFINER|INVOKER))?\\s+VIEW)|(DROP(?:\\s+ONLINE|\\s+OFFLINE)?\\s+INDEX)|(DROP(?:\\s+TEMPORARY)?\\s+TABLE)|(END)|(OPTIMIZE(?:\\s+NO_WRITE_TO_BINLOG|\\s+LOCAL)?\\s+TABLE)|(REPAIR(?:\\s+NO_WRITE_TO_BINLOG|\\s+LOCAL)?\\s+TABLE)|(SET(?:\\s+GLOBAL|\\s+SESSION)?\\s+TRANSACTION\\s+ISOLATION\\s+LEVEL)|(SHOW(?:\\s+FULL)?\\s+COLUMNS)|(SHOW(?:\\s+STORAGE)?\\s+ENGINES)|(SHOW\\s+(?:INDEX|INDEXES|KEYS))|(SHOW(?:\\s+FULL)?\\s+PROCESSLIST)|(SHOW(?:\\s+GLOBAL|\\s+SESSION)?\\s+STATUS)|(SHOW(?:\\s+FULL)?\\s+TABLES)|(SHOW(?:\\s+GLOBAL|\\s+SESSION)?\\s+VARIABLES)|(ALTER\\s+(?:DATABASE|SCHEMA)|ALTER\\s+LOGFILE\\s+GROUP|ALTER\\s+SERVER|ALTER\\s+TABLESPACE|BACKUP\\s+TABLE|CACHE\\s+INDEX|CALL|CHANGE\\s+MASTER\\s+TO|CHECK\\s+TABLE|CHECKSUM\\s+TABLE|CREATE\\s+(?:DATABASE|SCHEMA)|CREATE\\s+LOGFILE\\s+GROUP|CREATE\\s+SERVER|CREATE\\s+TABLESPACE|CREATE\\s+USER|DELETE|DESCRIBE|DO|DROP\\s+(?:DATABASE|SCHEMA)|DROP\\s+EVENT|DROP\\s+FUNCTION|DROP\\s+PROCEDURE|DROP\\s+LOGFILE\\s+GROUP|DROP\\s+SERVER|DROP\\s+TABLESPACE|DROP\\s+TRIGGER|DROP\\s+USER|DROP\\s+VIEW|EXPLAIN|FLUSH|GRANT|HANDLER|HELP|INSERT|INSTALL\\s+PLUGIN|JOIN|KILL|LOAD\\s+DATA\\s+FROM\\s+MASTER|LOAD\\s+DATA|LOAD\\s+INDEX|LOAD\\s+XML|PURGE\\s+MASTER\\s+LOGS|RENAME\\s+(?:DATABASE|SCHEMA)|RENAME\\s+TABLE|RENAME\\s+USER|REPLACE|RESET\\s+MASTER|RESET\\s+SLAVE|RESIGNAL|RESTORE\\s+TABLE|REVOKE|SELECT|SET\\s+PASSWORD|SHOW\\s+AUTHORS|SHOW\\s+BINARY\\s+LOGS|SHOW\\s+BINLOG\\s+EVENTS|SHOW\\s+CHARACTER\\s+SET|SHOW\\s+COLLATION|SHOW\\s+CONTRIBUTORS|SHOW\\s+CREATE\\s+(?:DATABASE|SCHEMA)|SHOW\\s+CREATE\\s+TABLE|SHOW\\s+CREATE\\s+VIEW|SHOW\\s+(?:DATABASE|SCHEMA)S|SHOW\\s+ENGINE|SHOW\\s+ERRORS|SHOW\\s+GRANTS|SHOW\\s+MASTER\\s+STATUS|SHOW\\s+OPEN\\s+TABLES|SHOW\\s+PLUGINS|SHOW\\s+PRIVILEGES|SHOW\\s+SCHEDULER\\s+STATUS|SHOW\\s+SLAVE\\s+HOSTS|SHOW\\s+SLAVE\\s+STATUS|SHOW\\s+TABLE\\s+STATUS|SHOW\\s+TRIGGERS|SHOW\\s+WARNINGS|SHOW|SIGNAL|START\\s+SLAVE|STOP\\s+SLAVE|UNINSTALL\\s+PLUGIN|UNION|UPDATE|USE)|(LOOP|LEAVE|ITERATE|WHILE)|(IF|ELSEIF)|(REPEAT|UNTIL)|(TRUNCATE(?:\\s+TABLE)?)|(START\\s+TRANSACTION|BEGIN|COMMIT|ROLLBACK)|(SAVEPOINT|ROLLBACK\\s+TO\\s+SAVEPOINT)|((?:UN)?LOCK\\s+TABLES?)|(SET\\s+NAMES|SET\\s+CHARACTER\\s+SET)|(ON\\s+DUPLICATE\\s+KEY\\s+UPDATE)|(IN\\s+BOOLEAN\\s+MODE|IN\\s+NATURAL\\s+LANGUAGE\\s+MODE|WITH\\s+QUERY\\s+EXPANSION)|(AUTO_INCREMENT)|(IS|IS\\s+NULL)|(BETWEEN|NOT\\s+BETWEEN|IN|NOT\\s+IN)|(ANY|SOME)|(ALL)|(EXISTS|NOT\\s+EXISTS)|(WITH\\s+ROLLUP)|(SOUNDS\\s+LIKE)|(LIKE|NOT\\s+LIKE)|(NOT\\s+REGEXP|REGEXP)|(RLIKE)|(NOT|AND|OR|XOR)|(CASE)|(DIV)|(BINARY)|(CURRENT_DATE|CURRENT_TIME|CURRENT_TIMESTAMP|LOCALTIME|LOCALTIMESTAMP|UTC_DATE|UTC_TIME|UTC_TIMESTAMP)|(INTERVAL)|(ACCESSIBLE|ADD|ALTER|ANALYZE|AS|ASC|ASENSITIVE|BEFORE|BOTH|BY|CASCADE|CHANGE|CHARACTER|CHECK|CLOSE|COLLATE|COLUMN|CONDITION|CONSTRAINT|CONTINUE|CONVERT|CREATE|CROSS|CURSOR|DATABASE|DATABASES|DAY_HOUR|DAY_MICROSECOND|DAY_MINUTE|DAY_SECOND|DECLARE|DEFAULT|DELAYED|DESC|DETERMINISTIC|DISTINCT|DISTINCTROW|DROP|DUAL|EACH|ELSE|ENCLOSED|ESCAPED|EXIT|FALSE|FETCH|FLOAT4|FLOAT8|FOR|FORCE|FOREIGN|FROM|FULLTEXT|GROUP|HAVING|HIGH_PRIORITY|HOUR_MICROSECOND|HOUR_MINUTE|HOUR_SECOND|IGNORE|INDEX|INFILE|INNER|INOUT|INSENSITIVE|INT1|INT2|INT3|INT4|INT8|INTO|KEY|KEYS|LEADING|LEFT|LIMIT|LINEAR|LINES|LOAD|LOCK|LONG|LOW_PRIORITY|MASTER_SSL_VERIFY_SERVER_CERT|MATCH|MIDDLEINT|MINUTE_MICROSECOND|MINUTE_SECOND|MODIFIES|NATURAL|NO_WRITE_TO_BINLOG|NULL|OFFSET|ON|OPEN|OPTIMIZE|OPTION|OPTIONALLY|ORDER|OUT|OUTER|OUTFILE|PRECISION|PRIMARY|PROCEDURE|PURGE|RANGE|READ|READS|READ_WRITE|REFERENCES|RELEASE|RENAME|REQUIRE|RESTRICT|RETURN|RIGHT|SCHEMA|SCHEMAS|SECOND_MICROSECOND|SENSITIVE|SEPARATOR|SPATIAL|SPECIFIC|SQL|SQLEXCEPTION|SQLSTATE|SQLWARNING|SQL_BIG_RESULT|SQL_CALC_FOUND_ROWS|SQL_SMALL_RESULT|SSL|STARTING|STRAIGHT_JOIN|TABLE|TERMINATED|THEN|TO|TRAILING|TRIGGER|TRUE|UNDO|UNIQUE|UNLOCK|UNSIGNED|USAGE|USING|VALUES|VARCHARACTER|VARYING|WHEN|WHERE|WITH|WRITE|XOR|YEAR_MONTH|ZEROFILL))\\b(?!\\()|\\b(bit|tinyint|bool|boolean|smallint|mediumint|int|integer|bigint|float|double\\s+precision|double|real|decimal|dec|numeric|fixed|(date|datetime|timestamp|time|year)|(char|varchar|binary|varbinary|tinyblob|tinytext|blob|text|mediumblob|mediumtext|longblob|longtext|enum|set)|(geometry|point|linestring|polygon|multipoint|multilinestring|multipolygon|geometrycollection)|(mod)|(CURRENT_USER)|(InnoDB|MyISAM|MEMORY|CSV|ARCHIVE|BLACKHOLE|MERGE|FEDERATED)|(MRG_MyISAM)|(PARTITION\\s+BY\\s+RANGE)|(PARTITION\\s+BY\\s+LIST)|(PARTITION\\s+BY\\s+COLUMNS)|(PARTITION\\s+BY\\s+HASH)|(PARTITION\\s+BY\\s+LINEAR\\s+HASH)|(PARTITION\\s+BY(?:\\s+LINEAR)?\\s+KEY))\\b|\\b(coalesce|greatest|isnull|interval|least|(if|ifnull|nullif)|(ascii|bin|bit_length|char|char_length|character_length|concat|concat_ws|conv|elt|export_set|field|find_in_set|format|hex|insert|instr|lcase|left|length|load_file|locate|lower|lpad|ltrim|make_set|mid|oct|octet_length|ord|position|quote|repeat|replace|reverse|right|rpad|rtrim|soundex|sounds_like|space|substr|substring|substring_index|trim|ucase|unhex|upper)|(strcmp)|(abs|acos|asin|atan|atan2|ceil|ceiling|cos|cot|crc32|degrees|exp|floor|ln|log|log2|log10|pi|pow|power|radians|rand|round|sign|sin|sqrt|tan|truncate)|(adddate|addtime|convert_tz|curdate|curtime|date|datediff|date_add|date_format|date_sub|day|dayname|dayofmonth|dayofweek|dayofyear|extract|from_days|from_unixtime|get_format|hour|last_day|makedate|maketime|microsecond|minute|month|monthname|now|period_add|period_diff|quarter|second|sec_to_time|str_to_date|subdate|subtime|sysdate|time|timediff|timestamp|timestampadd|timestampdiff|time_format|time_to_sec|to_days|to_seconds|unix_timestamp|week|weekday|weekofyear|year|yearweek)|(cast|convert)|(extractvalue|updatexml)|(bit_count)|(aes_encrypt|aes_decrypt|compress|decode|encode|des_decrypt|des_encrypt|encrypt|md5|old_password|password|sha|sha1|uncompress|uncompressed_length)|(benchmark|charset|coercibility|collation|connection_id|database|found_rows|last_insert_id|row_count|schema|session_user|system_user|user|version)|(default|get_lock|inet_aton|inet_ntoa|is_free_lock|is_used_lock|master_pos_wait|name_const|release_lock|sleep|uuid|uuid_short|values)|(avg|bit_and|bit_or|bit_xor|count|count_distinct|group_concat|min|max|std|stddev|stddev_pop|stddev_samp|sum|var_pop|var_samp|variance)|(asbinary|aswkb)|(astext|aswkt)|(mbrcontains|mbrdisjoint|mbrequal|mbrintersects|mbroverlaps|mbrtouches|mbrwithin|contains|crosses|disjoint|equals|intersects|overlaps|touches|within)|(buffer|convexhull|difference|intersection|symdifference)|(dimension|envelope|geometrytype|srid|boundary|isempty|issimple|x|y|endpoint|glength|numpoints|pointn|startpoint|isring|isclosed|area|exteriorring|interiorringn|numinteriorrings|centroid|geometryn|numgeometries)|(geomcollfromtext|geomfromtext|linefromtext|mlinefromtext|mpointfromtext|mpolyfromtext|pointfromtext|polyfromtext|bdmpolyfromtext|bdpolyfromtext|geomcollfromwkb|geomfromwkb|linefromwkb|mlinefromwkb|mpointfromwkb|mpolyfromwkb|pointfromwkb|polyfromwkb|bdmpolyfromwkb|bdpolyfromwkb|geometrycollection|linestring|multilinestring|multipoint|multipolygon|point|polygon)|(row)|(match|against))(\\s*\\(|\$)/gi; // collisions: char, set, union(), allow parenthesis - IN, ANY, ALL, SOME, NOT, AND, OR, XOR\njush.links2.sqlset = /(\\b)(ignore_builtin_innodb|innodb_adaptive_hash_index|innodb_additional_mem_pool_size|innodb_autoextend_increment|innodb_autoinc_lock_mode|innodb_buffer_pool_awe_mem_mb|innodb_buffer_pool_size|innodb_commit_concurrency|innodb_concurrency_tickets|innodb_data_file_path|innodb_data_home_dir|innodb_doublewrite|innodb_fast_shutdown|innodb_file_io_threads|innodb_file_per_table|innodb_flush_log_at_trx_commit|innodb_flush_method|innodb_force_recovery|innodb_checksums|innodb_lock_wait_timeout|innodb_locks_unsafe_for_binlog|innodb_log_arch_dir|innodb_log_archive|innodb_log_buffer_size|innodb_log_file_size|innodb_log_files_in_group|innodb_log_group_home_dir|innodb_max_dirty_pages_pct|innodb_max_purge_lag|innodb_mirrored_log_groups|innodb_open_files|innodb_rollback_on_timeout|innodb_stats_on_metadata|innodb_support_xa|innodb_sync_spin_loops|innodb_table_locks|innodb_thread_concurrency|innodb_thread_sleep_delay|innodb_use_legacy_cardinality_algorithm|(ndb[-_]batch[-_]size)|(ndb[-_]log[-_]update[-_]as[-_]write|ndb_log_updated_only)|(ndb_log_orig)|(slave[-_]allow[-_]batching)|(have_ndbcluster|multi_range_count|ndb_autoincrement_prefetch_sz|ndb_cache_check_time|ndb_extra_logging|ndb_force_send|ndb_use_copying_alter_table|ndb_use_exact_count|ndb_wait_connected)|(log[-_]bin[-_]trust[-_]function[-_]creators|log[-_]bin)|(binlog_cache_size|max_binlog_cache_size|max_binlog_size|sync_binlog)|(auto_increment_increment|auto_increment_offset)|(ndb_log_empty_epochs)|(log[-_]slave[-_]updates|report[-_]host|report[-_]password|report[-_]port|report[-_]user|slave[-_]net[-_]timeout|slave[-_]skip[-_]errors)|(init_slave|rpl_recovery_rank|slave_compressed_protocol|slave_exec_mode|slave_transaction_retries|sql_slave_skip_counter)|(master[-_]bind|slave[-_]load[-_]tmpdir|server[-_]id)|(sql_big_tables)|(basedir|big[-_]tables|binlog[-_]format|collation[-_]server|datadir|debug|delay[-_]key[-_]write|engine[-_]condition[-_]pushdown|event[-_]scheduler|general[-_]log|character[-_]set[-_]filesystem|character[-_]set[-_]server|character[-_]sets[-_]dir|init[-_]file|language|large[-_]pages|log[-_]error|log[-_]output|log[-_]queries[-_]not[-_]using[-_]indexes|log[-_]slow[-_]queries|log[-_]warnings|log|low[-_]priority[-_]updates|memlock|min[-_]examined[-_]row[-_]limit|old[-_]passwords|open[-_]files[-_]limit|pid[-_]file|port|safe[-_]show[-_]database|secure[-_]auth|secure[-_]file[-_]priv|skip[-_]external[-_]locking|skip[-_]networking|skip[-_]show[-_]database|slow[-_]query[-_]log|socket|sql[-_]mode|tmpdir|version)|(autocommit|error_count|foreign_key_checks|identity|insert_id|last_insert_id|profiling|profiling_history_size|rand_seed1|rand_seed2|sql_auto_is_null|sql_big_selects|sql_buffer_result|sql_log_bin|sql_log_off|sql_log_update|sql_notes|sql_quote_show_create|sql_safe_updates|sql_warnings|timestamp|unique_checks|warning_count)|(sql_low_priority_updates)|(sql_max_join_size)|(automatic_sp_privileges|back_log|bulk_insert_buffer_size|collation_connection|collation_database|completion_type|concurrent_insert|connect_timeout|date_format|datetime_format|default_week_format|delayed_insert_limit|delayed_insert_timeout|delayed_queue_size|div_precision_increment|expire_logs_days|flush|flush_time|ft_boolean_syntax|ft_max_word_len|ft_min_word_len|ft_query_expansion_limit|ft_stopword_file|general_log_file|group_concat_max_len|have_archive|have_blackhole_engine|have_compress|have_crypt|have_csv|have_dynamic_loading|have_example_engine|have_federated_engine|have_geometry|have_innodb|have_isam|have_merge_engine|have_openssl|have_partitioning|have_query_cache|have_raid|have_row_based_replication|have_rtree_keys|have_ssl|have_symlink|hostname|character_set_client|character_set_connection|character_set_database|character_set_results|character_set_system|init_connect|interactive_timeout|join_buffer_size|keep_files_on_create|key_buffer_size|key_cache_age_threshold|key_cache_block_size|key_cache_division_limit|large_page_size|lc_time_names|license|local_infile|locked_in_memory|log_bin|long_query_time|lower_case_file_system|lower_case_table_names|max_allowed_packet|max_connect_errors|max_connections|max_delayed_threads|max_error_count|max_heap_table_size|max_insert_delayed_threads|max_join_size|max_length_for_sort_data|max_prepared_stmt_count|max_relay_log_size|max_seeks_for_key|max_sort_length|max_sp_recursion_depth|max_tmp_tables|max_user_connections|max_write_lock_count|myisam_data_pointer_size|myisam_max_sort_file_size|myisam_recover_options|myisam_repair_threads|myisam_sort_buffer_size|myisam_stats_method|myisam_use_mmap|named_pipe|net_buffer_length|net_read_timeout|net_retry_count|net_write_timeout|new|old|optimizer_prune_level|optimizer_search_depth|optimizer_switch|plugin_dir|preload_buffer_size|prepared_stmt_count|protocol_version|pseudo_thread_id|query_alloc_block_size|query_cache_limit|query_cache_min_res_unit|query_cache_size|query_cache_type|query_cache_wlock_invalidate|query_prealloc_size|range_alloc_block_size|read_buffer_size|read_only|read_rnd_buffer_size|relay_log_purge|relay_log_space_limit|shared_memory|shared_memory_base_name|slow_launch_time|slow_query_log_file|sort_buffer_size|sql_select_limit|storage_engine|sync_frm|system_time_zone|table_cache|table_definition_cache|table_lock_wait_timeout|table_open_cache|table_type|thread_cache_size|thread_concurrency|thread_handling|thread_stack|time_format|time_zone|timed_mutexes|tmp_table_size|transaction_alloc_block_size|transaction_prealloc_size|tx_isolation|updatable_views_with_limit|version_comment|version_compile_machine|version_compile_os|wait_timeout)|(ssl[-_]ca|ssl[-_]capath|ssl[-_]cert|ssl[-_]cipher|ssl[-_]key))((?!-)\\b)/gi;\njush.links2.sqlstatus = /()(Com_.+|(.+))()/gi;\n";
} elseif ($_GET["file"] == "logo.png") {
	header("Content-Type: image/png");
	echo "\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x009\x00\x00\x009\x04\x03\x00\x00\x00~6\x9e\xb6\x00\x00\x000PLTE\x00\x00\x00\x83\x97\xad+NvYt\x93s\x89\xa3\x9e\xae\xbe\xb4\xbe\xcc\xc8\xd2\xda\xfc\x8d\x91\xfcsu\xfcIJ\xf7\xd3\xd4\xfc/.\xfc\x06\x07\xfc\xaf\xb1\xfa\xfc\xfaC\x04\xa5\xd7\x00\x00\x00\x01tRNS\x00@\xe6\xd8f\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x01\xb4IDAT8\x8d\xd5\x94\xcdN\xc2@\x10\xc7\xfb\x06\x1bE\xe1\xecl\x13\xcf\xb6\xf5\x01\xa4p6\x1a\x88G.\$=\x12\xa3\xa5\xc7>\x81\xe1\t\x0cw5r\x16\x0f}\x82z7\xb2>\x80\x91P\x13\xe5#\$\x8c\xb3K\xa1j\xab7\x8d\xfc\x0f\xdd\xb6\xbf\xcc\xce\xcc\x7f?4m\x95\x84\x88\xd1\xf7t&\xee~\xc03!\x1e0\x930\x8a\x9a^\x84\xbdAf0\xde\"\xe5\xbd\x11\xed,\xca\xf0*\xa0\xe74\xbc\x8c\xe2o\xa5E\xe8\xb3\x08\xe8\xd7X(*Y\xd3\xf3\xbc\xb8\t6\t\xefPcOW\xa2\x15\xc9\xce\xdc\x8am\x92\xacr\x830\xc3~/\xa0\xe1L\xa8\x01\rXj\x0b#\xd6\x15m\xca\xc1\xfaj\xc0C\x80]G\xa6m\xe6\x00\xb6}\x16\xde\xcb\x04\xac\xdf\x91u\xbcA9\xc0X\xa3\n\xd4\xd88\xbcV\xb1\x1dY\xc4+\xc7D#\xa8iq\xdenKQ8J\xe01Q6\x11\xb2\xe6Y0\xa7`\x95\x1d\x9fP\xb3b\x02Q\x8d\\\x1ah\x94~>\xf3:pS\xc9\x80\x1d\xa3\xa6\xbc\xa2\xd8\xf3GE\xf5Q=\xeeI\xcf{\x92*\x9f\x173\xeb2\xa37\xf7\n\x15e\xca\x14L\xe8B\x8a~\xd0/R(\$\xb0\x0e)\xca\xe7\x8b \x97\xc1HQn\x80i\x956\x0fJ\xb6\t<\x9d\xd7-.\x96w\xc7\xc9\xaaj\xeaVm\xab\xea\xfcm\xbf?S\xdeH\xa0\x9bv\xc3\xcc\xfb\xf1\xc6\xa9\xa7\xdd\x00\xe0\xd6^\xd5q\xab\x1b\xb6\x01)\xaa\x0f\x97\xdb]\xf7\x8b\x19U\xb992\xd1,;\xff\xc7\x8d\x17\xee'p\xf8\xb5\xa3!X\xcb\x83\xe4\xda\xdc\xffL\xf1D.\xbbt\xc3\xa6\x97\xfd/w\x14\xc3\xd3\xe4\xec\x17R\xf7\x1b\x9d\tw\xadd\xd3\xd6r2\xef\xc6\xa4\xaa4[=\xbd\x03E5\xf7S+\xf1\x97c\x00\x00\x00\x00IEND\xaeB`\x82";
}
exit;

}

// Adminer doesn't use any global variables; they used to be declared here

if (!$_SERVER["REQUEST_URI"]) { // IIS 5 compatibility
	$_SERVER["REQUEST_URI"] = $_SERVER["ORIG_PATH_INFO"];
}
if (!strpos($_SERVER["REQUEST_URI"], '?') && $_SERVER["QUERY_STRING"] != "") { // IIS 7 compatibility
	$_SERVER["REQUEST_URI"] .= "?$_SERVER[QUERY_STRING]";
}
if ($_SERVER["HTTP_X_FORWARDED_PREFIX"]) {
	$_SERVER["REQUEST_URI"] = $_SERVER["HTTP_X_FORWARDED_PREFIX"] . $_SERVER["REQUEST_URI"];
}
define('Adminer\HTTPS', ($_SERVER["HTTPS"] && strcasecmp($_SERVER["HTTPS"], "off")) || ini_bool("session.cookie_secure")); // session.cookie_secure could be set on HTTP if we are behind a reverse proxy

@ini_set("session.use_trans_sid", '0'); // protect links in export, @ - may be disabled
if (!defined("SID")) {
	session_cache_limiter(""); // to allow restarting session
	session_name("adminer_sid"); // use specific session name to get own namespace
	session_set_cookie_params(0, preg_replace('~\?.*~', '', $_SERVER["REQUEST_URI"]), "", HTTPS, true); // ini_set() may be disabled
	session_start();
}

// disable magic quotes to be able to use database escaping function
if (function_exists("get_magic_quotes_gpc") && get_magic_quotes_gpc()) {
	$_GET = remove_slashes($_GET, $filter);
	$_POST = remove_slashes($_POST, $filter);
	$_COOKIE = remove_slashes($_COOKIE, $filter);
}
if (function_exists("get_magic_quotes_runtime") && get_magic_quotes_runtime()) {
	set_magic_quotes_runtime(false);
}
@set_time_limit(0); // @ - can be disabled
@ini_set("precision", '15'); // @ - can be disabled, 15 - internal PHP precision

/** Translate string
* @param literal-string $idf
* @param float|string $number
*/
function lang($idf, $number = null) {
	if (is_string($idf)) { // compiled version uses numbers, string comes from a plugin
		// English translation is closest to the original identifiers //! pluralized translations are not found
		$pos = array_search($idf, get_translations("en")); //! this should be cached
		if ($pos !== false) {
			$idf = $pos;
		}
	}
	$args = func_get_args();
	// this is matched by compile.php
	$args[0] = Lang::$translations[$idf] ?: $idf;
	return call_user_func_array('Adminer\lang_format', $args);
}

/** Format translation, usable also by plugins
* @param string|list<string> $translation
* @param float|string $number
*/
function lang_format($translation, $number = null) {
	if (is_array($translation)) {
		// this is matched by compile.php
		$pos = ($number == 1 ? 0
			: (LANG == 'cs' || LANG == 'sk' ? ($number && $number < 5 ? 1 : 2) // different forms for 1, 2-4, other
			: (LANG == 'fr' ? (!$number ? 0 : 1) // different forms for 0-1, other
			: (LANG == 'pl' ? ($number % 10 > 1 && $number % 10 < 5 && $number / 10 % 10 != 1 ? 1 : 2) // different forms for 1, 2-4 except 12-14, other
			: (LANG == 'sl' ? ($number % 100 == 1 ? 0 : ($number % 100 == 2 ? 1 : ($number % 100 == 3 || $number % 100 == 4 ? 2 : 3))) // different forms for 1, 2, 3-4, other
			: (LANG == 'lt' ? ($number % 10 == 1 && $number % 100 != 11 ? 0 : ($number % 10 > 1 && $number / 10 % 10 != 1 ? 1 : 2)) // different forms for 1, 12-19, other
			: (LANG == 'lv' ? ($number % 10 == 1 && $number % 100 != 11 ? 0 : ($number ? 1 : 2)) // different forms for 1 except 11, other, 0
			: (in_array(LANG, array('bs', 'ru', 'sr', 'uk')) ? ($number % 10 == 1 && $number % 100 != 11 ? 0 : ($number % 10 > 1 && $number % 10 < 5 && $number / 10 % 10 != 1 ? 1 : 2)) // different forms for 1 except 11, 2-4 except 12-14, other
			: 1)))))))) // different forms for 1, other
		; // http://www.gnu.org/software/gettext/manual/html_node/Plural-forms.html
		$translation = $translation[$pos];
	}
	$translation = str_replace("'", '’', $translation); // translations can contain HTML or be used in optionlist (we couldn't escape them here) but they can also be used e.g. in title='' //! escape plaintext translations
	$args = func_get_args();
	array_shift($args);
	$format = str_replace("%d", "%s", $translation);
	if ($format != $translation) {
		$args[0] = format_number($number);
	}
	return vsprintf($format, $args);
}

// this is matched by compile.php
// not used in a single language version from here

/** Get available languages
* @return string[]
*/
function langs() {
	return array(
		'en' => 'English', // Jakub Vrána - https://www.vrana.cz
		'ar' => 'العربية', // Y.M Amine - Algeria - nbr7@live.fr
		'bg' => 'Български', // Deyan Delchev
		'bn' => 'বাংলা', // Dipak Kumar - dipak.ndc@gmail.com, Hossain Ahmed Saiman - hossain.ahmed@altscope.com
		'bs' => 'Bosanski', // Emir Kurtovic
		'ca' => 'Català', // Joan Llosas
		'cs' => 'Čeština', // Jakub Vrána - https://www.vrana.cz
		'da' => 'Dansk', // Jarne W. Beutnagel - jarne@beutnagel.dk
		'de' => 'Deutsch', // Klemens Häckel - http://clickdimension.wordpress.com
		'el' => 'Ελληνικά', // Dimitrios T. Tanis - jtanis@tanisfood.gr
		'es' => 'Español', // Klemens Häckel - http://clickdimension.wordpress.com
		'et' => 'Eesti', // Priit Kallas
		'fa' => 'فارسی', // mojtaba barghbani - Iran - mbarghbani@gmail.com, Nima Amini - http://nimlog.com
		'fi' => 'Suomi', // Finnish - Kari Eveli - http://www.lexitec.fi/
		'fr' => 'Français', // Francis Gagné, Aurélien Royer
		'gl' => 'Galego', // Eduardo Penabad Ramos
		'he' => 'עברית', // Binyamin Yawitz - https://stuff-group.com/
		'hi' => 'हिन्दी', // Joshi yogesh
		'hu' => 'Magyar', // Borsos Szilárd (Borsosfi) - http://www.borsosfi.hu, info@borsosfi.hu
		'id' => 'Bahasa Indonesia', // Ivan Lanin - http://ivan.lanin.org
		'it' => 'Italiano', // Alessandro Fiorotto, Paolo Asperti
		'ja' => '日本語', // Hitoshi Ozawa - http://sourceforge.jp/projects/oss-ja-jpn/releases/
		'ka' => 'ქართული', // Saba Khmaladze skhmaladze@uglt.org
		'ko' => '한국어', // dalli - skcha67@gmail.com
		'lt' => 'Lietuvių', // Paulius Leščinskas - http://www.lescinskas.lt
		'lv' => 'Latviešu', // Kristaps Lediņš - https://krysits.com
		'ms' => 'Bahasa Melayu', // Pisyek
		'nl' => 'Nederlands', // Maarten Balliauw - http://blog.maartenballiauw.be
		'no' => 'Norsk', // Iver Odin Kvello, mupublishing.com
		'pl' => 'Polski', // Radosław Kowalewski - http://srsbiz.pl/
		'pt' => 'Português', // André Dias
		'pt-br' => 'Português (Brazil)', // Gian Live - gian@live.com, Davi Alexandre davi@davialexandre.com.br, RobertoPC - http://www.robertopc.com.br
		'ro' => 'Limba Română', // .nick .messing - dot.nick.dot.messing@gmail.com
		'ru' => 'Русский', // Maksim Izmaylov; Andre Polykanine - https://github.com/Oire/
		'sk' => 'Slovenčina', // Ivan Suchy - http://www.ivansuchy.com, Juraj Krivda - http://www.jstudio.cz
		'sl' => 'Slovenski', // Matej Ferlan - www.itdinamik.com, matej.ferlan@itdinamik.com
		'sr' => 'Српски', // Nikola Radovanović - cobisimo@gmail.com
		'sv' => 'Svenska', // rasmusolle - https://github.com/rasmusolle
		'ta' => 'த‌மிழ்', // G. Sampath Kumar, Chennai, India, sampathkumar11@gmail.com
		'th' => 'ภาษาไทย', // Panya Saraphi, elect.tu@gmail.com - http://www.opencart2u.com/
		'tr' => 'Türkçe', // Bilgehan Korkmaz - turktron.com
		'uk' => 'Українська', // Valerii Kryzhov
		'uz' => 'Oʻzbekcha', // Junaydullaev Inoyatullokhon - https://av.uz/
		'vi' => 'Tiếng Việt', // Giang Manh @ manhgd google mail
		'zh' => '简体中文', // Mr. Lodar, vea - urn2.net - vea.urn2@gmail.com
		'zh-tw' => '繁體中文', // http://tzangms.com
	);
}

function switch_lang() {
	echo "<form action='' method='post'>\n<div id='lang'>";
	echo "<label>" . lang(21) . ": " . html_select("lang", langs(), LANG, "this.form.submit();") . "</label>";
	echo " <input type='submit' value='" . lang(22) . "' class='hidden'>\n";
	echo input_token();
	echo "</div>\n</form>\n";
}

if (isset($_POST["lang"]) && verify_token()) { // $error not yet available
	cookie("adminer_lang", $_POST["lang"]);
	$_SESSION["lang"] = $_POST["lang"]; // cookies may be disabled
	redirect(remove_from_uri());
}

$LANG = "en";
if (idx(langs(), $_COOKIE["adminer_lang"])) {
	cookie("adminer_lang", $_COOKIE["adminer_lang"]);
	$LANG = $_COOKIE["adminer_lang"];
} elseif (idx(langs(), $_SESSION["lang"])) {
	$LANG = $_SESSION["lang"];
} else {
	$accept_language = array();
	preg_match_all('~([-a-z]+)(;q=([0-9.]+))?~', str_replace("_", "-", strtolower($_SERVER["HTTP_ACCEPT_LANGUAGE"])), $matches, PREG_SET_ORDER);
	foreach ($matches as $match) {
		$accept_language[$match[1]] = (isset($match[3]) ? $match[3] : 1);
	}
	arsort($accept_language);
	foreach ($accept_language as $key => $q) {
		if (idx(langs(), $key)) {
			$LANG = $key;
			break;
		}
		$key = preg_replace('~-.*~', '', $key);
		if (!isset($accept_language[$key]) && idx(langs(), $key)) {
			$LANG = $key;
			break;
		}
	}
}

define('Adminer\LANG', $LANG);

class Lang {
	/** @var array<literal-string, string|list<string>> */ static $translations;
}

Lang::$translations = get_translations(LANG);

function get_translations($lang) {
	switch ($lang) {
		case "en": return [
  '%.3f s',
  'Unable to upload a file.',
  'Maximum allowed file size is %sB.',
  'File does not exist.',
  ',',
  '0123456789',
  'User types',
  'Are you sure?',
  'Increase %s.',
  'File uploads are disabled.',
  'original',
  'No tables.',
  'Edit',
  'Insert',
  'No rows.',
  'You have no privileges to update this table.',
  'Save',
  'Save and continue edit',
  'Save and insert next',
  'Saving',
  'Delete',
  'Language',
  'Use',
  'Unknown error.',
  'System',
  'Server',
  'hostname[:port] or :socket',
  'Username',
  'Password',
  'Database',
  'Login',
  'Permanent login',
  'Adminer does not support accessing a database without a password, <a href="https://www.adminer.org/en/password/"%s>more information</a>.',
  'Select data',
  'Show structure',
  'Alter view',
  'Alter table',
  'New item',
  'Warnings',
  [
    '%d byte',
    '%d bytes',
  ],
  'Column',
  'Type',
  'Comment',
  'Auto Increment',
  'Default value',
  'Select',
  'Functions',
  'Aggregation',
  'Search',
  'anywhere',
  'Sort',
  'descending',
  'Limit',
  'Text length',
  'Action',
  'Full table scan',
  'SQL command',
  'open',
  'save',
  'Alter database',
  'Alter schema',
  'Create schema',
  'Database schema',
  'Privileges',
  'Routines',
  'Sequences',
  'Events',
  'Import',
  'Export',
  'Create table',
  'DB',
  'select',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  'Disable %s or enable %s or %s extensions.',
  'Numbers',
  'Date and time',
  'Strings',
  'Lists',
  'Binary',
  'Geometry',
  'ltr',
  'You are offline.',
  'Logout',
  [
    'Too many unsuccessful logins, try again in %d minute.',
    'Too many unsuccessful logins, try again in %d minutes.',
  ],
  'Logout successful.',
  'Thanks for using Adminer, consider <a href="https://www.adminer.org/en/donation/">donating</a>.',
  'Session expired, please login again.',
  'Master password expired. <a href="https://www.adminer.org/en/extension/"%s>Implement</a> %s method to make it permanent.',
  'Session support must be enabled.',
  'The action will be performed after successful login with the same credentials.',
  'No extension',
  'None of the supported PHP extensions (%s) are available.',
  'Connecting to privileged ports is not allowed.',
  'Invalid credentials.',
  'There is a space in the input password which might be the cause.',
  'Invalid CSRF token. Send the form again.',
  'Maximum number of allowed fields exceeded. Please increase %s.',
  'If you did not send this request from Adminer then close this page.',
  'Too big POST data. Reduce the data or increase the %s configuration directive.',
  'You can upload a big SQL file via FTP and import it from server.',
  'Foreign keys',
  'collation',
  'ON UPDATE',
  'ON DELETE',
  'Column name',
  'Parameter name',
  'Length',
  'Options',
  'Add next',
  'Move up',
  'Move down',
  'Remove',
  'Invalid database.',
  'Databases have been dropped.',
  'Select database',
  'Create database',
  'Process list',
  'Variables',
  'Status',
  '%s version: %s through PHP extension %s',
  'Logged as: %s',
  'Refresh',
  'Collation',
  'Tables',
  'Size',
  'Compute',
  'Selected',
  'Drop',
  'Loaded plugins',
  'screenshot',
  'Materialized view',
  'View',
  'Table',
  'Inherits from',
  'Indexes',
  'Alter indexes',
  'Source',
  'Target',
  'Alter',
  'Add foreign key',
  'Checks',
  'Create check',
  'Triggers',
  'Add trigger',
  'Inherited by',
  'Permanent link',
  'Output',
  'Format',
  'Data',
  'Create user',
  'ATTACH queries are not supported.',
  'Error in query',
  '%d / ',
  [
    '%d row',
    '%d rows',
  ],
  [
    'Query executed OK, %d row affected.',
    'Query executed OK, %d rows affected.',
  ],
  'No commands to execute.',
  [
    '%d query executed OK.',
    '%d queries executed OK.',
  ],
  'Execute',
  'Limit rows',
  'File upload',
  'From server',
  'Webserver file %s',
  'Run file',
  'Stop on error',
  'Show only errors',
  'History',
  'Clear',
  'Edit all',
  'Item has been deleted.',
  'Item has been updated.',
  'Item%s has been inserted.',
  'Table has been dropped.',
  'Table has been altered.',
  'Table has been created.',
  'Table name',
  'engine',
  'Default values',
  'Drop %s?',
  'Partition by',
  'Partitions',
  'Partition name',
  'Values',
  'Indexes have been altered.',
  'Index Type',
  'Algorithm',
  'Columns',
  'length',
  'Name',
  'Condition',
  'Database has been dropped.',
  'Database has been renamed.',
  'Database has been created.',
  'Database has been altered.',
  'Call',
  [
    'Routine has been called, %d row affected.',
    'Routine has been called, %d rows affected.',
  ],
  'Foreign key has been dropped.',
  'Foreign key has been altered.',
  'Foreign key has been created.',
  'Source and target columns must have the same data type, there must be an index on the target columns and referenced data must exist.',
  'Foreign key',
  'Target table',
  'Change',
  'Add column',
  'View has been altered.',
  'View has been dropped.',
  'View has been created.',
  'Create view',
  'Event has been dropped.',
  'Event has been altered.',
  'Event has been created.',
  'Alter event',
  'Create event',
  'Start',
  'End',
  'Every',
  'On completion preserve',
  'Routine has been dropped.',
  'Routine has been altered.',
  'Routine has been created.',
  'Alter function',
  'Alter procedure',
  'Create function',
  'Create procedure',
  'Return type',
  'Check has been dropped.',
  'Check has been altered.',
  'Check has been created.',
  'Alter check',
  'Trigger has been dropped.',
  'Trigger has been altered.',
  'Trigger has been created.',
  'Alter trigger',
  'Create trigger',
  'Time',
  'Event',
  'User has been dropped.',
  'User has been altered.',
  'User has been created.',
  'Hashed',
  'Routine',
  'Grant',
  'Revoke',
  [
    '%d process has been killed.',
    '%d processes have been killed.',
  ],
  'Clone',
  '%d in total',
  'Kill',
  [
    '%d item has been affected.',
    '%d items have been affected.',
  ],
  'Ctrl+click on a value to modify it.',
  'File must be in UTF-8 encoding.',
  [
    '%d row has been imported.',
    '%d rows have been imported.',
  ],
  'Unable to select the table',
  'Modify',
  'Relations',
  'edit',
  'Use edit link to modify this value.',
  'Load more data',
  'Loading',
  'Page',
  'last',
  'Whole result',
  'Tables have been truncated.',
  'Tables have been moved.',
  'Tables have been copied.',
  'Tables have been dropped.',
  'Tables have been optimized.',
  'Schema',
  'Tables and views',
  'Search data in tables',
  'Engine',
  'Data Length',
  'Index Length',
  'Data Free',
  'Rows',
  'Vacuum',
  'Optimize',
  'Check',
  'Analyze',
  'Repair',
  'Truncate',
  'Move to other database',
  'Move',
  'Copy',
  'overwrite',
  'Schedule',
  'At given time',
];
		case "ar": return [
  '%.3f s',
  'يتعذر رفع ملف ما.',
  'حجم الملف الأقصى هو %sB.',
  'الملف غير موجود.',
  ',',
  '0123456789',
  'نوع المستخدم',
  'هل أنت متأكد؟',
  'Increase %s.',
  'رفع الملفات غير مشغل.',
  'الأصلي',
  'لا توجد جداول.',
  'تعديل',
  'إنشاء',
  'لا توجد نتائج.',
  'You have no privileges to update this table.',
  'حفظ',
  'إحفظ و واصل التعديل',
  'جفظ و إنشاء التالي',
  'Saving',
  'مسح',
  'اللغة',
  'استعمال',
  'Unknown error.',
  'النظام',
  'الخادم',
  'hostname[:port] or :socket',
  'اسم المستخدم',
  'كلمة المرور',
  'قاعدة بيانات',
  'تسجيل الدخول',
  'تسجيل دخول دائم',
  'Adminer does not support accessing a database without a password, <a href="https://www.adminer.org/en/password/"%s>more information</a>.',
  'عرض البيانات',
  'عرض التركيبة',
  'تعديل عرض',
  'تعديل الجدول',
  'عنصر جديد',
  'Warnings',
  '%d بايت',
  'عمود',
  'النوع',
  'تعليق',
  'تزايد تلقائي',
  'Default value',
  'اختيار',
  'الدوال',
  'تجميع',
  'بحث',
  'في اي مكان',
  'ترتيب',
  'تنازلي',
  'حد',
  'طول النص',
  'الإجراء',
  'Full table scan',
  'استعلام SQL',
  'فتح',
  'حفظ',
  'تعديل قاعدة البيانات',
  'تعديل المخطط',
  'إنشاء مخطط',
  'مخطط فاعدة البيانات',
  'الإمتيازات',
  'الروتينات',
  'السلاسل',
  'الأحداث',
  'استيراد',
  'تصدير',
  'إنشاء جدول',
  'DB',
  'تحديد',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  'Disable %s or enable %s or %s extensions.',
  'أعداد',
  'التاريخ و الوقت',
  'سلاسل',
  'قوائم',
  'ثنائية',
  'هندسة',
  'rtl',
  'You are offline.',
  'تسجيل الخروج',
  'Too many unsuccessful logins, try again in %d minute(s).',
  'تم تسجيل الخروج بنجاح.',
  'Thanks for using Adminer, consider <a href="https://www.adminer.org/en/donation/">donating</a>.',
  'إنتهت الجلسة، من فضلك أعد تسجيل الدخول.',
  'Master password expired. <a href="https://www.adminer.org/en/extension/"%s>Implement</a> %s method to make it permanent.',
  'عليك تفعيل نظام الجلسات.',
  'The action will be performed after successful login with the same credentials.',
  'امتداد غير موجود',
  'إمتدادات php (%s) المدعومة غير موجودة.',
  'Connecting to privileged ports is not allowed.',
  'بيانات الدخول غير صالحة.',
  'There is a space in the input password which might be the cause.',
  'رمز CSRF غير صالح. المرجو إرسال الاستمارة مرة أخرى.',
  'لقد تجاوزت العدد الأقصى للحقول. يرجى الرفع من %s.',
  'If you did not send this request from Adminer then close this page.',
  'معلومات POST كبيرة جدا. قم بتقليص حجم المعلومات أو قم بزيادة قيمة %s في خيارات ال PHP.',
  'You can upload a big SQL file via FTP and import it from server.',
  'مفاتيح أجنبية',
  'الترتيب',
  'ON UPDATE',
  'ON DELETE',
  'اسم العمود',
  'اسم المتغير',
  'الطول',
  'خيارات',
  'إضافة التالي',
  'نقل للأعلى',
  'نقل للأسفل',
  'مسح',
  'قاعدة البيانات غير صالحة.',
  'تم حذف قواعد البيانات.',
  'اختر قاعدة البيانات',
  'إنشاء قاعدة بيانات',
  'قائمة الإجراءات',
  'متغيرات',
  'حالة',
  'النسخة %s : %s عن طريق إمتداد ال PHP %s',
  'تم تسجيل الدخول باسم %s',
  'تحديث',
  'ترتيب',
  'جداول',
  'Size',
  'Compute',
  'Selected',
  'حذف',
  'Loaded plugins',
  'screenshot',
  'Materialized view',
  'عرض',
  'جدول',
  'Inherits from',
  'المؤشرات',
  'تعديل المؤشرات',
  'المصدر',
  'الهدف',
  'تعديل',
  'إضافة مفتاح أجنبي',
  'Checks',
  'Create check',
  'الزنادات',
  'إضافة زناد',
  'Inherited by',
  'رابط دائم',
  'إخراج',
  'الصيغة',
  'معلومات',
  'إنشاء مستخدم',
  'ATTACH queries are not supported.',
  'هناك خطأ في الاستعلام',
  '%d / ',
  '%d أسطر',
  'تم تنفسذ الاستعلام, %d عدد الأسطر المعدلة.',
  'لا توجد أوامر للتنفيذ.',
  [
    'تم تنفيذ الاستعلام %d بنجاح.',
    'تم تنفيذ الاستعلامات %d بنجاح.',
  ],
  'تنفيذ',
  'Limit rows',
  'رفع ملف',
  'من الخادم',
  'ملف %s من خادم الويب',
  'نفذ الملف',
  'أوقف في حالة حدوث خطأ',
  'إظهار الأخطاء فقط',
  'تاريخ',
  'مسح',
  'تعديل الكل',
  'تم حذف العنصر.',
  'تم تعديل العنصر.',
  '%sتم إدراج العنصر.',
  'تم حذف الجدول.',
  'تم تعديل الجدول.',
  'تم إنشاء الجدول.',
  'اسم الجدول',
  'المحرك',
  'القيم الافتراضية',
  'Drop %s?',
  'مقسم بواسطة',
  'التقسيمات',
  'اسم التقسيم',
  'القيم',
  'تم تعديل المؤشر.',
  'نوع المؤشر',
  'Algorithm',
  'Columns',
  'الطول',
  'الاسم',
  'Condition',
  'تم حذف قاعدة البيانات.',
  'تمت إعادة تسمية فاعدة البيانات.',
  'تم إنشاء قاعدة البيانات.',
  'تم تعديل قاعدة البيانات.',
  'استدعاء',
  'تم استدعاء الروتين, عدد الأسطر المعدلة %d.',
  'تم مسح المفتاح الأجنبي.',
  'تم تعديل المفتاح الأجنبي.',
  'تم إنشاء المفتاح الأجنبي.',
  'أعمدة المصدر و الهدف يجب أن تكون بنفس النوع, يجب أن يكون هناك مؤشر في أعمدة الهدف و البيانات المرجعية يجب ان تكون موجودة.',
  'مفتاح أجنبي',
  'الجدول المستهدف',
  'تعديل',
  'إضافة عمودا',
  'تم تعديل العرض.',
  'تم مسح العرض.',
  'تم إنشاء العرض.',
  'إنشاء عرض',
  'تم مسح الحدث.',
  'تم تعديل الحدث.',
  'تم إنشاء الحدث.',
  'تعديل حدث',
  'إنشاء حدث',
  'إبدأ',
  'إنهاء',
  'كل',
  'حفظ عند الإنتهاء',
  'تم حذف الروتين.',
  'تم تعديل الروتين.',
  'تم إنشاء الروتين.',
  'تعديل الدالة',
  'تعديل الإجراء',
  'إنشاء دالة',
  'إنشاء إجراء',
  'نوع العودة',
  'Check has been dropped.',
  'Check has been altered.',
  'Check has been created.',
  'Alter check',
  'تم حذف الزناد.',
  'تم تعديل الزناد.',
  'تم إنشاء الزناد.',
  'تعديل زناد',
  'إنشاء زناد',
  'الوقت',
  'الحدث',
  'تم حذف المستخدم.',
  'تم تعديل المستخدم.',
  'تم إنشاء المستخدم.',
  'تلبيد',
  'روتين',
  'موافق',
  'إلغاء',
  'عدد الإجراءات التي تم إيقافها %d.',
  'نسخ',
  '%d في المجموع',
  'إيقاف',
  'عدد العناصر المعدلة هو %d.',
  'Ctrl+click on a value to modify it.',
  'File must be in UTF-8 encoding.',
  'تم استيراد %d سطرا.',
  'يتعذر اختيار الجدول',
  'Modify',
  'علاقات',
  'تعديل',
  'استعمل الرابط "تعديل" لتعديل هذه القيمة.',
  'Load more data',
  'Loading',
  'صفحة',
  'الأخيرة',
  'نتيجة كاملة',
  'تم قطع الجداول.',
  'تم نقل الجداول.',
  'تم نسخ الجداول.',
  'تم حذف الجداول.',
  'Tables have been optimized.',
  'المخطط',
  'الجداول و العروض',
  'بحث في الجداول',
  'المحرك',
  'طول المعطيات',
  'طول المؤشر',
  'المساحة الحرة',
  'الأسطر',
  'Vacuum',
  'تحسين',
  'فحص',
  'تحليل',
  'إصلاح',
  'قطع',
  'نقل إلى قاعدة بيانات أخرى',
  'نقل',
  'نسخ',
  'overwrite',
  'مواعيد',
  'في وقت محدد',
  'HH:MM:SS',
];
		case "bg": return [
  '%.3f s',
  'Неуспешно прикачване на файл.',
  'Максимално разрешената големина на файл е %sB.',
  'Файлът не съществува.',
  ',',
  '0123456789',
  'Видове потребители',
  'Сигурни ли сте?',
  'Increase %s.',
  'Прикачването на файлове е забранено.',
  'оригинал',
  'Няма таблици.',
  'Редактиране',
  'Вмъкване',
  'Няма редове.',
  'Нямате праве за обновяване на таблицата.',
  'Запис',
  'Запис и редакция',
  'Запис и нов',
  'Записване',
  'Изтриване',
  'Език',
  'Избор',
  'Unknown error.',
  'Система',
  'Сървър',
  'hostname[:port] or :socket',
  'Потребител',
  'Парола',
  'База данни',
  'Вход',
  'Запаметяване',
  'Adminer does not support accessing a database without a password, <a href="https://www.adminer.org/en/password/"%s>more information</a>.',
  'Показване на данни',
  'Структура',
  'Промяна на изглед',
  'Промяна на таблица',
  'Нов елемент',
  'Warnings',
  [
    '%d байт',
    '%d байта',
  ],
  'Колона',
  'Вид',
  'Коментар',
  'Автоматично увеличаване',
  'Стойност по подразбиране',
  'Показване',
  'Функции',
  'Съвкупност',
  'Търсене',
  'навсякъде',
  'Сортиране',
  'низходящо',
  'Редове',
  'Текст',
  'Действие',
  'Пълно сканиране на таблицата',
  'SQL команда',
  'показване',
  'запис',
  'Промяна на база данни',
  'Промяна на схемата',
  'Създаване на схема',
  'Схема на базата данни',
  'Права',
  'Процедури',
  'Последователности',
  'Събития',
  'Импорт',
  'Експорт',
  'Създаване на таблица',
  'DB',
  'показване',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  'Disable %s or enable %s or %s extensions.',
  'Числа',
  'Дата и час',
  'Низове',
  'Списъци',
  'Двоични',
  'Геометрия',
  'ltr',
  'Вие сте офлайн.',
  'Изход',
  [
    'Прекалено много неуспешни опити за вход, опитайте пак след %d минута.',
    'Прекалено много неуспешни опити за вход, опитайте пак след %d минути.',
  ],
  'Излизането е успешно.',
  'Thanks for using Adminer, consider <a href="https://www.adminer.org/en/donation/">donating</a>.',
  'Сесията е изтекла; моля, влезте отново.',
  'Главната парола вече е невалидна. <a href="https://www.adminer.org/en/extension/"%s>Изберете</a> %s метод, за да я направите постоянна.',
  'Поддръжката на сесии трябва да е разрешена.',
  'The action will be performed after successful login with the same credentials.',
  'Няма разширение',
  'Никое от поддържаните PHP разширения (%s) не е налично.',
  'Connecting to privileged ports is not allowed.',
  'Невалидни потребителски данни.',
  'There is a space in the input password which might be the cause.',
  'Невалиден шифроващ ключ. Попълнете и изпратете формуляра отново.',
  'Максималния брой полета е превишен. Моля, увеличете %s.',
  'Ако не сте изпратили тази заявка през Adminer, затворете тази страница.',
  'Изпратени са прекалено много данни. Намалете обема на данните или увеличете %s управляващата директива.',
  'Можете да прикачите голям SQL файл чрез FTP и да го импортирате от сървъра.',
  'Препратки',
  'кодировка',
  'При промяна',
  'При изтриване',
  'Име на колоната',
  'Име на параметъра',
  'Големина',
  'Опции',
  'Добавяне на следващ',
  'Преместване нагоре',
  'Преместване надолу',
  'Премахване',
  'Невалидна база данни.',
  'Базите данни бяха премехнати.',
  'Избор на база данни',
  'Създаване на база данни',
  'Списък с процеси',
  'Променливи',
  'Състояние',
  '%s версия: %s през PHP разширение %s',
  'Текущ потребител: %s',
  'Обновяване',
  'Кодировка',
  'Таблици',
  'Големина',
  'Изчисляване',
  'Избран',
  'Премахване',
  'Loaded plugins',
  'screenshot',
  'Запаметен изглед',
  'Изглед',
  'Таблица',
  'Inherits from',
  'Индекси',
  'Промяна на индекси',
  'Източник',
  'Цел',
  'Промяна',
  'Добавяне на препратка',
  'Checks',
  'Create check',
  'Тригери',
  'Добавяне на тригер',
  'Inherited by',
  'Постоянна препратка',
  'Резултат',
  'Формат',
  'Данни',
  'Създаване на потребител',
  'ATTACH queries are not supported.',
  'Грешка в заявката',
  '%d / ',
  [
    '%d ред',
    '%d реда',
  ],
  [
    'Заявката е изпълнена, %d ред е засегнат.',
    'Заявката е изпълнена, %d редове са засегнати.',
  ],
  'Няма команди за изпълнение.',
  [
    '%d заявка е изпълнена.',
    '%d заявки са изпълнени.',
  ],
  'Изпълнение',
  'Лимит на редовете',
  'Прикачване на файл',
  'От сървър',
  'Сървърен файл %s',
  'Изпълнение на файл',
  'Спиране при грешка',
  'Показване само на грешките',
  'Хронология',
  'Изчистване',
  'Редактиране на всички',
  'Елемента беше изтрит.',
  'Елемента беше обновен.',
  'Елементи%s бяха вмъкнати.',
  'Таблицата беше премахната.',
  'Таблицата беше променена.',
  'Таблицата беше създадена.',
  'Име на таблица',
  'система',
  'Стойности по подразбиране',
  'Drop %s?',
  'Разделяне на',
  'Раздели',
  'Име на раздела',
  'Стойности',
  'Индексите бяха променени.',
  'Вид на индекса',
  'Algorithm',
  'Columns',
  'дължина',
  'Име',
  'Condition',
  'Базата данни беше премахната.',
  'Базата данни беше преименувана.',
  'Базата данни беше създадена.',
  'Базата данни беше променена.',
  'Прилагане',
  [
    'Беше приложена процедура, %d ред е засегнат.',
    'Беше приложена процедура, %d редове са засегнати.',
  ],
  'Препратката беше премахната.',
  'Препратката беше променена.',
  'Препратката беше създадена.',
  'Колоните източник и цел трябва да са от еднакъв вид, трябва да има индекс на колоните приемник и да има въведени данни.',
  'Препратка',
  'Таблица приемник',
  'Промяна',
  'Добавяне на колона',
  'Изгледа беше променен.',
  'Изгледа беше премахнат.',
  'Изгледа беше създаден.',
  'Създаване на изглед',
  'Събитието беше премахнато.',
  'Събитието беше променено.',
  'Събитието беше създадено.',
  'Промяна на събитие',
  'Създаване на събитие',
  'Начало',
  'Край',
  'Всеки',
  'Запазване след завършване',
  'Процедурата беше премахната.',
  'Процедурата беше променена.',
  'Процедурата беше създадена.',
  'Промяна на функция',
  'Промяна на процедура',
  'Създаване на функция',
  'Създаване на процедура',
  'Резултат',
  'Check has been dropped.',
  'Check has been altered.',
  'Check has been created.',
  'Alter check',
  'Тригера беше премахнат.',
  'Тригера беше променен.',
  'Тригера беше създаден.',
  'Промяна на тригер',
  'Създаване на тригер',
  'Време',
  'Събитие',
  'Потребителя беше премахнат.',
  'Потребителя беше променен.',
  'Потребителя беше създаден.',
  'Хеширан',
  'Процедура',
  'Осигуряване',
  'Отнемане',
  [
    '%d процес беше прекъснат.',
    '%d процеса бяха прекъснати.',
  ],
  'Клониране',
  '%d всичко',
  'Прекъсване',
  [
    '%d елемент беше засегнат.',
    '%d елемента бяха засегнати.',
  ],
  'Ctrl+щракване в стойността, за да я промените.',
  'Файла трябва да е с UTF-8 кодировка.',
  [
    '%d ред беше импортиран.',
    '%d реда бяха импортирани.',
  ],
  'Неуспешно показване на таблицата',
  'Промяна',
  'Зависимости',
  'редакция',
  'Използвайте \'редакция\' за промяна на данните.',
  'Зареждане на повече данни',
  'Зареждане',
  'Страница',
  'последен',
  'Пълен резултат',
  'Таблиците бяха изрязани.',
  'Таблиците бяха преместени.',
  'Таблиците бяха копирани.',
  'Таблиците бяха премахнати.',
  'Таблиците бяха оптимизирани.',
  'Схема',
  'Таблици и изгледи',
  'Търсене на данни в таблиците',
  'Система',
  'Големина на данните',
  'Големина на индекса',
  'Свободно място',
  'Редове',
  'Консолидиране',
  'Оптимизиране',
  'Проверка',
  'Анализиране',
  'Поправка',
  'Изрязване',
  'Преместване в друга база данни',
  'Преместване',
  'Копиране',
  'overwrite',
  'Насрочване',
  'В зададено време',
  'Промяна на вид',
];
		case "bn": return [
  '%.3f s',
  'ফাইল আপলোড করা সম্ভব হচ্ছে না।',
  'সর্বাধিক অনুমোদিত ফাইল সাইজ %sB।',
  'ফাইলটির কোন অস্তিত্ব নেই।',
  ',',
  '০১২৩৪৫৬৭৮৯',
  'ব্যবহারকারির ধরণ',
  'আপনি কি নিশ্চিত?',
  'Increase %s.',
  'ফাইল আপলোড নিষ্ক্রিয় করা আছে।',
  'প্রকৃত',
  'কোন টেবিল নাই।',
  'সম্পাদনা',
  'সংযোজন',
  'কোন সারি নাই।',
  'এই টেবিল আপডেট করার জন্য আপনার কোন অনুমতি নেই।',
  'সংরক্ষণ করুন',
  'সংরক্ষণ করুন এবং সম্পাদনা চালিয়ে যান',
  'সংরক্ষন ও পরবর্তী সংযোজন করুন',
  'সংরক্ষণ করা হচ্ছে',
  'মুছে ফেলুন',
  'ভাষা',
  'ব্যবহার',
  'অজানা ত্রুটি।',
  'সিস্টেম',
  'সার্ভার',
  'hostname[:port] or :socket',
  'ইউজারের নাম',
  'পাসওয়ার্ড',
  'ডাটাবেজ',
  'লগইন',
  'স্থায়ী লগইন',
  'Adminer পাসওয়ার্ড ছাড়া ডাটাবেস অ্যাক্সেস সমর্থন করে না, <a href="https://www.adminer.org/en/password/"%s>আরও তথ্য</a>।',
  'তথ্য নির্বাচন করো',
  'গঠন দেখান',
  'ভিউ পরিবর্তন করুন',
  'টেবিল পরিবর্তন করুন',
  'নতুন বিষয়বস্তু',
  'সতর্কতা',
  [
    '%d বাইট',
    '%d বাইটসমূহ',
  ],
  'কলাম',
  'ধরণ',
  'মন্তব্য',
  'স্বয়ংক্রিয় বৃদ্ধি',
  'ডিফল্ট মান',
  'নির্বাচন',
  'ফাংশন সমূহ',
  'সমষ্টি',
  'খোঁজ',
  'যে কোন স্থানে',
  'সাজানো',
  'ক্রমহ্রাস',
  'সীমা',
  'টেক্সট দৈর্ঘ্য',
  'ক্রিয়া',
  'সম্পূর্ণ টেবিল স্ক্যান',
  'SQL-কমান্ড',
  'খোলা',
  'সংরক্ষণ',
  'ডাটাবেজ পরিবর্তন করুন',
  'স্কিমা পরিবর্তন করো',
  'স্কিমা তৈরী করো',
  'ডাটাবেজ স্কিমা',
  'প্রিভিলেজেস',
  'রুটিনসমূহ',
  'অনুক্রম',
  'ইভেন্টসমূহ',
  'ইমপোর্ট',
  'এক্সপোর্ট',
  'টেবিল তৈরী করুন',
  'ডিবি',
  'নির্বাচন',
  '%s অবশ্যই <a%s>একটি অ্যারে রিটার্ন করতে হবে</a>।',
  '<a%s>কনফিগার করুন</a> %s এ %s।',
  '%s নিষ্ক্রিয় করুন অথবা %s বা %s এক্সটেনশন সক্রিয় করুন।',
  'সংখ্যা',
  'তারিখ এবং সময়',
  'স্ট্রিং',
  'তালিকা',
  'বাইনারি',
  'জ্যামিতি',
  'ltr',
  'আপনি অফলাইনে আছেন।',
  'লগআউট',
  [
    'অনেকগুলি ব্যর্থ লগইন প্রচেষ্টা, %d মিনিট পরে আবার চেষ্টা করুন।',
  ],
  'সফলভাবে লগআউট হয়েছে।',
  'Adminer ব্যবহার করার জন্য ধন্যবাদ, <a href="https://www.adminer.org/en/donation/">দান করার</a> কথা বিবেচনা করুন।',
  'সেশনের মেয়াদ শেষ হয়েছে, আবার লগইন করুন।',
  'মাস্টার পাসওয়ার্ডের মেয়াদ শেষ হয়েছে। এটিকে স্থায়ী করতে <a href="https://www.adminer.org/en/extension/"%s>ইমপ্লিমেন্ট</a> %s মেথড।',
  'সেশন সমর্থন সক্রিয় করা আবশ্যক।',
  'একই ক্রেডেনশিয়ালস দিয়ে সফলভাবে লগইন করার পরে এই কর্মটি সম্পাদন করা হবে।',
  'কোন এক্সটেনশান নাই',
  'কোন PHP সমর্থিত এক্সটেনশন (%s) পাওয়া যায় নাই।',
  'প্রিভিলেজড পোর্টে সংযোগ করা অনুমোদিত নয়।',
  'ভুল পাসওয়ার্ড।',
  'ইনপুট পাসওয়ার্ডে একটি স্পেস রয়েছে যা এর কারণ হতে পারে।',
  'অবৈধ CSRF টোকেন। ফর্মটি আবার পাঠান।',
  'অনুমোদিত ফিল্ড এর সর্বাধিক সংখ্যা অতিক্রম করে গেছে। অনুগ্রহপূর্বক %s বৃদ্ধি করুন।',
  'আপনি যদি Adminer থেকে এই অনুরোধ না করে থাকেন তবে এই পৃষ্ঠাটি বন্ধ করুন।',
  'খুব বড় POST ডাটা। ডাটা সংক্ষিপ্ত করো অথবা %s কনফিগারেশন নির্দেশ বৃদ্ধি করো।',
  'আপনি FTP এর মাধ্যমে একটি বড় SQL ফাইল আপলোড করতে পারেন এবং সার্ভার থেকে এটি ইম্পোর্ট করতে পারেন।',
  'ফরেন কী',
  'সমষ্টি',
  'অন আপডেট',
  'অন ডিলিট',
  'কলামের নাম',
  'প্যারামিটারের নাম',
  'দৈর্ঘ্য',
  'বিকল্পসমূহ',
  'পরবর্তী সংযোজন করুন',
  'উপরে স্থানান্তর',
  'নীচে স্থানান্তর',
  'মুছে ফেলুন',
  'অকার্যকর ডাটাবেজ।',
  'ডাটাবেজসমূহ মুছে ফেলা হয়েছে।',
  'ডাটাবেজ নির্বাচন করুন',
  'ডাটাবেজ তৈরী করুন',
  'প্রসেস তালিকা',
  'চলকসমূহ',
  'অবস্থা',
  'ভার্সন %s: %s, %s PHP এক্সটেনশনের মধ্য দিয়ে',
  '%s হিসাবে লগড',
  'রিফ্রেশ',
  'কলোকেশন',
  'টেবিলসমূহ',
  'আকার',
  'কম্পিউট',
  'নির্বাচিত',
  'মুছে ফেলো',
  'লোড করা প্লাগইনগুলি',
  'স্ক্রিনশট',
  'মেটেরিয়ালাইজড ভিউ',
  'ভিউ',
  'টেবিল',
  'থেকে উত্তরাধিকারসূত্রে প্রাপ্ত',
  'সূচীসমূহ',
  'সূচীসমূহ পরিবর্তন করুন',
  'উৎস',
  'লক্ষ্য',
  'পরিবর্তন',
  'ফরেন কী সংযোজন করুন',
  'চেকস',
  'চেক তৈরি করুন',
  'ট্রিগার',
  'ট্রিগার সংযোজন করুন',
  'Inherited by',
  'স্থায়ী লিংক',
  'আউটপুট',
  'বিন্যাস',
  'ডাটা',
  'ব্যবহারকারি তৈরী করুন',
  'ATTACH কোয়েরি সমর্থিত নয়।',
  'অনুসন্ধানে ভুল আছে',
  [
    '%d / ',
  ],
  [
    '%d সারি',
    '%d সারি সমূহ',
  ],
  [
    'কোয়্যারী সম্পাদন হয়েছে, %d সারি প্রভাবিত হয়েছে।',
    'কোয়্যারী সম্পাদন হয়েছে, %d সারি প্রভাবিত হয়েছে।',
  ],
  'সম্পাদন করার মত কোন নির্দেশ নেই।',
  [
    'SQL-অনুসন্ধান সফলভাবে সম্পন্ন হয়েছে।',
    '%d SQL-অনুসন্ধানসমূহ সফলভাবে সম্পন্ন হয়েছে।',
  ],
  'সম্পাদন করো',
  'সারি সীমিত করুন',
  'ফাইল আপলোড',
  'সার্ভার থেকে',
  'ওয়েবসার্ভার ফাইল %s',
  'ফাইল চালাও',
  'ত্রুটি পেলে থেমে যান',
  'শুধুমাত্র ত্রুটিগুলো দেখান',
  'ইতিহাস',
  'সাফ করো',
  'সবগুলো সম্পাদনা করুন',
  'বিষয়বস্তু মুছে ফেলা হয়েছে।',
  'বিষয়বস্তু হালনাগাদ করা হয়েছে।',
  'বিষয়বস্তুসমূহ%s সংযোজন করা হয়েছে।',
  'টেবিল মুছে ফেলা হয়েছে।',
  'টেবিল পরিবর্তন করা হয়েছে।',
  'টেবিল তৈরী করা হয়েছে।',
  'টেবিলের নাম',
  'ইন্জিন',
  'ডিফল্ট মান',
  '%s ড্রপ করবেন?',
  'পার্টিশন যার মাধ্যমে',
  'পার্টিশন',
  'পার্টিশনের নাম',
  'মানসমূহ',
  'সূচীসমূহ সম্পাদনা করা হয়েছে।',
  'সূচী-ধরণ',
  'অ্যালগরিদম',
  'কলাম',
  'দৈর্ঘ্য',
  'নাম',
  'Condition',
  'ডাটাবেজ মুছে ফেলা হয়েছে।',
  'ডাটাবেজের নতুন নামকরণ করা হয়েছে।',
  'ডাটাবেজ তৈরী করা হয়েছে।',
  'ডাটাবেজ পরিবর্তন করা হয়েছে।',
  'কল',
  [
    'রুটিন কল করা হয়েছে, %d টি সারি(সমূহ) প্রভাবিত হয়েছে।',
    'রুটিন কল করা হয়েছে, %d টি সারি(সমূহ) প্রভাবিত হয়েছে।',
  ],
  'ফরেন কী মুছে ফেলা হয়েছে।',
  'ফরেন কী পরিবর্তন করা হয়েছে।',
  'ফরেন কী তৈরী করা হয়েছে।',
  'সোর্স এবং টার্গেট কলামে একই ডাটা টাইপ থাকতে হবে, টার্গেট কলামসমূহে একটি সূচী এবং রেফারেন্সড ডেটার উপস্থিতি থাকা আবশ্যক।',
  'ফরেন কী ',
  'টার্গেট টেবিল',
  'পরিবর্তন',
  'কলাম সংযোজন করুন',
  'ভিউ পরিবর্তন করা হয়েছে।',
  'ভিউ মুছে ফেলা হয়েছে।',
  'ভিউ তৈরী করা হয়েছে।',
  'ভিউ তৈরী করুন',
  'ইভেন্ট মুছে ফেলা হয়েছে।',
  'ইভেন্ট সম্পাদনা করা হয়েছে।',
  'ইভেন্ট তৈরী করা হয়েছে।',
  'ইভেন্ট সম্পাদনা করো',
  'ইভেন্ট তৈরী করো',
  'শুরু',
  'সমাপ্তি',
  'প্রত্যেক',
  'সমাপ্ত হওয়ার পর সংরক্ষন করুন',
  'রুটিন মুছে ফেলা হয়েছে।',
  'রুটিন পরিবর্তন করা হয়েছে।',
  'রুটিন তৈরী করা হয়েছে।',
  'ফাংশন পরিবর্তন করুন',
  'কার্যপ্রণালী পরিবর্তন করুন',
  'ফাংশন তৈরী করুন',
  'কার্যপ্রণালী তৈরী করুন',
  'রিটার্ন টাইপ',
  'চেক ড্রপ করা হয়েছে।',
  'চেক পরিবর্তন করা হয়েছে।',
  'চেক তৈরি করা হয়েছে।',
  'চেক পরিবর্তন করুন',
  'ট্রিগার মুছে ফেলা হয়েছে।',
  'ট্রিগার পরিবর্তন করা হয়েছে।',
  'ট্রিগার তৈরী করা হয়েছে।',
  'ট্রিগার পরিবর্তন করুন',
  'ট্রিগার তৈরী করুন',
  'সময়',
  'ইভেন্ট',
  'ব্যবহারকারি মুছে ফেলা হয়েছে।',
  'ব্যবহারকারি সম্পাদনা করা হয়েছে।',
  'ব্যবহারকারি তৈরী করা হয়েছে।',
  'হ্যাশড',
  'রুটিন',
  'অনুমতি',
  'প্রত্যাহার',
  [
    '%d টি প্রসেস(সমূহ) বিনষ্ট করা হয়েছে।',
    '%d টি প্রসেস(সমূহ) বিনষ্ট করা হয়েছে।',
  ],
  'ক্লোন',
  'সর্বমোটঃ %d টি',
  'বিনষ্ট করো',
  '%d টি বিষয়বস্তু প্রভাবিত হয়েছে।',
  'একটি মান পরিবর্তন করতে Ctrl+ক্লিক করুন।',
  'ফাইলটি UTF-8 এনকোডিংয়ে হতে হবে।',
  [
    '%d টি সারি(সমূহ) ইমপোর্ট করা হয়েছে।',
    '%d টি সারি(সমূহ) ইমপোর্ট করা হয়েছে।',
  ],
  'টেবিল নির্বাচন করতে অক্ষম',
  'পরিবর্তন করুন',
  'সম্পর্ক',
  'সম্পাদনা',
  'এই মানটি পরিবর্তনের জন্য সম্পাদনা লিঙ্ক ব্যবহার করুন।',
  'আরও ডেটা লোড করুন',
  'লোড হচ্ছে',
  'পৃষ্ঠা',
  'সর্বশেষ',
  'সম্পূর্ণ ফলাফল',
  'টেবিল ছাঁটাই করা হয়েছে।',
  'টেবিল স্থানান্তর করা হয়েছে।',
  'টেবিলগুলো কপি করা হয়েছে।',
  'টেবিলসমূহ মুছে ফেলা হয়েছে।',
  'টেবিলগুলি অপ্টিমাইজ করা হয়েছে।',
  'স্কিমা',
  'টেবিল এবং ভিউ সমূহ',
  'টেবিলে তথ্য খুঁজুন',
  'ইঞ্জিন',
  'ডাটার দৈর্ঘ্য',
  'ইনডেক্স এর দৈর্ঘ্য',
  'তথ্য মুক্ত',
  'সারিসমূহ',
  'ভ্যাকুয়াম',
  'অপটিমাইজ',
  'পরীক্ষা',
  'বিশ্লেষণ',
  'মেরামত',
  'ছাঁটাই',
  'অন্য ডাটাবেজে স্থানান্তর করুন',
  'স্থানান্তর করুন',
  'কপি',
  'ওভাররাইট',
  'সময়সূচি',
  'প্রদত্ত সময়ে',
  'না',
];
		case "bs": return [
  '%.3f s',
  'Slanje datoteke nije uspelo.',
  'Najveća dozvoljena veličina datoteke je %sB.',
  'Datoteka ne postoji.',
  ',',
  '0123456789',
  'Korisnički tipovi',
  'Da li ste sigurni?',
  'Increase %s.',
  'Onemogućeno je slanje datoteka.',
  'original',
  'Bez tabela.',
  'Izmijeni',
  'Umetni',
  'Bez redova.',
  'You have no privileges to update this table.',
  'Sačuvaj',
  'Sačuvaj i nastavi uređenje',
  'Sačuvaj i umijetni slijedeće',
  'Saving',
  'Izbriši',
  'Jezik',
  'Koristi',
  'Unknown error.',
  'Sistem',
  'Server',
  'hostname[:port] or :socket',
  'Korisničko ime',
  'Lozinka',
  'Baza podataka',
  'Prijava',
  'Trajna prijava',
  'Adminer does not support accessing a database without a password, <a href="https://www.adminer.org/en/password/"%s>more information</a>.',
  'Izaberi podatke',
  'Prikaži strukturu',
  'Ažuriraj pogled',
  'Ažuriraj tabelu',
  'Nova stavka',
  'Warnings',
  [
    '%d bajt',
    '%d bajta',
    '%d bajtova',
  ],
  'kolumna',
  'Tip',
  'Komentar',
  'Auto-priraštaj',
  'Default value',
  'Izaberi',
  'Funkcije',
  'Sakupljanje',
  'Pretraga',
  'bilo gdje',
  'Poređaj',
  'opadajuće',
  'Granica',
  'Dužina teksta',
  'Akcija',
  'Skreniranje kompletne tabele',
  'SQL komanda',
  'otvori',
  'spasi',
  'Ažuriraj bazu podataka',
  'Ažuriraj šemu',
  'Formiraj šemu',
  'Šema baze podataka',
  'Dozvole',
  'Rutine',
  'Nizovi',
  'Događaji',
  'Uvoz',
  'Izvoz',
  'Napravi tabelu',
  'DB',
  'izaberi',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  'Disable %s or enable %s or %s extensions.',
  'Broj',
  'Datum i vrijeme',
  'Tekst',
  'Liste',
  'Binarno',
  'Geometrija',
  'ltr',
  'You are offline.',
  'Odjava',
  'Too many unsuccessful logins, try again in %d minute(s).',
  'Uspešna odjava.',
  'Thanks for using Adminer, consider <a href="https://www.adminer.org/en/donation/">donating</a>.',
  'Vaša sesija je istekla, prijavite se ponovo.',
  'Master password expired. <a href="https://www.adminer.org/en/extension/"%s>Implement</a> %s method to make it permanent.',
  'Morate omogućiti podršku za sesije.',
  'The action will be performed after successful login with the same credentials.',
  'Bez dodataka',
  'Nijedan od podržanih PHP dodataka (%s) nije dostupan.',
  'Connecting to privileged ports is not allowed.',
  'Nevažeće dozvole.',
  'There is a space in the input password which might be the cause.',
  'Nevažeći CSRF kod. Proslijedite ponovo formu.',
  'Premašen je maksimalni broj dozvoljenih polja. Molim uvećajte %s.',
  'If you did not send this request from Adminer then close this page.',
  'Preveliki POST podatak. Morate da smanjite podatak ili povećajte vrijednost konfiguracione direktive %s.',
  'You can upload a big SQL file via FTP and import it from server.',
  'Strani ključevi',
  'Sravnjivanje',
  'ON UPDATE (prilikom osvežavanja)',
  'ON DELETE (prilikom brisanja)',
  'Naziv kolumne',
  'Naziv parametra',
  'Dužina',
  'Opcije',
  'Dodaj slijedeći',
  'Pomijeri na gore',
  'Pomijeri na dole',
  'Ukloni',
  'Neispravna baza podataka.',
  'Baze podataka su izbrisane.',
  'Izaberite bazu',
  'Formiraj bazu podataka',
  'Spisak procesa',
  'Promijenljive',
  'Status',
  '%s verzija: %s pomoću PHP dodatka je %s',
  'Prijavi se kao: %s',
  'Osveži',
  'Sravnjivanje',
  'Tabele',
  'Size',
  'Compute',
  'Izabrano',
  'Izbriši',
  'Loaded plugins',
  'screenshot',
  'Materialized view',
  'Pogled',
  'Tabela',
  'Inherits from',
  'Indeksi',
  'Ažuriraj indekse',
  'Izvor',
  'Cilj',
  'Ažuriraj',
  'Dodaj strani ključ',
  'Checks',
  'Create check',
  'Okidači',
  'Dodaj okidač',
  'Inherited by',
  'Trajna veza',
  'Ispis',
  'Format',
  'Podaci',
  'Novi korisnik',
  'ATTACH queries are not supported.',
  'Greška u upitu',
  '%d / ',
  [
    '%d red',
    '%d reda',
    '%d redova',
  ],
  [
    'Upit je uspiješno izvršen, %d red je ažuriran.',
    'Upit je uspiješno izvršen, %d reda su ažurirana.',
    'Upit je uspiješno izvršen, %d redova je ažurirano.',
  ],
  'Bez komandi za izvršavanje.',
  [
    '%d upit je uspiješno izvršen.',
    '%d upita su uspiješno izvršena.',
    '%d upita je uspiješno izvršeno.',
  ],
  'Izvrši',
  'Limit rows',
  'Slanje datoteka',
  'Sa servera',
  'Datoteka %s sa veb servera',
  'Pokreni datoteku',
  'Zaustavi prilikom greške',
  'Prikazuj samo greške',
  'Historijat',
  'Očisti',
  'Izmijeni sve',
  'Stavka je izbrisana.',
  'Stavka je izmijenjena.',
  'Stavka %s je spašena.',
  'Tabela je izbrisana.',
  'Tabela je izmijenjena.',
  'Tabela je spašena.',
  'Naziv tabele',
  'stroj',
  'Podrazumijevane vrijednosti',
  'Drop %s?',
  'Podijeli po',
  'Podijele',
  'Ime podijele',
  'Vrijednosti',
  'Indeksi su izmijenjeni.',
  'Tip indeksa',
  'Algorithm',
  'Columns',
  'dužina',
  'Ime',
  'Condition',
  'Baza podataka je izbrisana.',
  'Baza podataka je preimenovana.',
  'Baza podataka je spašena.',
  'Baza podataka je izmijenjena.',
  'Pozovi',
  [
    'Pozvana je rutina, %d red je ažuriran.',
    'Pozvana je rutina, %d reda su ažurirani.',
    'Pozvana je rutina, %d redova je ažurirano.',
  ],
  'Strani ključ je izbrisan.',
  'Strani ključ je izmijenjen.',
  'Strani ključ je spašen.',
  'Izvorne i ciljne kolumne moraju biti istog tipa, ciljna kolumna mora biti indeksirana i izvorna tabela mora sadržati podatke iz ciljne.',
  'Strani ključ',
  'Ciljna tabela',
  'izmijeni',
  'Dodaj kolumnu',
  'Pogled je izmijenjen.',
  'Pogled je izbrisan.',
  'Pogled je spašen.',
  'Napravi pogled',
  'Događaj je izbrisan.',
  'Događaj je izmijenjen.',
  'Događaj je spašen.',
  'Ažuriraj događaj',
  'Napravi događaj',
  'Početak',
  'Kraj',
  'Svaki',
  'Zadrži po završetku',
  'Rutina je izbrisana.',
  'Rutina je izmijenjena.',
  'Rutina je spašena.',
  'Ažuriraj funkciju',
  'Ažuriraj proceduru',
  'Formiraj funkciju',
  'Formiraj proceduru',
  'Povratni tip',
  'Check has been dropped.',
  'Check has been altered.',
  'Check has been created.',
  'Alter check',
  'Okidač je izbrisan.',
  'Okidač je izmijenjen.',
  'Okidač je spašen.',
  'Ažuriraj okidač',
  'Formiraj okidač',
  'Vrijeme',
  'Događaj',
  'Korisnik je izbrisan.',
  'Korisnik je izmijenjen.',
  'korisnik je spašen.',
  'Heširano',
  'Rutina',
  'Dozvoli',
  'Opozovi',
  [
    '%d proces je ukinut.',
    '%d procesa su ukinuta.',
    '%d procesa je ukinuto.',
  ],
  'Dupliraj',
  'ukupno %d',
  'Ubij',
  [
    '%d stavka je ažurirana.',
    '%d stavke su ažurirane.',
    '%d stavki je ažurirano.',
  ],
  'Ctrl+klik na vrijednost za izmijenu.',
  'File must be in UTF-8 encoding.',
  [
    '%d red je uvežen.',
    '%d reda su uvežena.',
    '%d redova je uveženo.',
  ],
  'Ne mogu da izaberem tabelu',
  'Izmjene',
  'Odnosi',
  'izmijeni',
  'Koristi vezu za izmijenu ove vrijednosti.',
  'Učitavam još podataka',
  'Učitavam',
  'Strana',
  'poslijednja',
  'Ceo rezultat',
  'Tabele su ispražnjene.',
  'Tabele su premješćene.',
  'Tabele su umnožene.',
  'Tabele su izbrisane.',
  'Tabele su optimizovane.',
  'Šema',
  'Tabele i pogledi',
  'Pretraži podatke u tabelama',
  'Stroj',
  'Dužina podataka',
  'Dužina indeksa',
  'Slobodno podataka',
  'Redova',
  'Vacuum',
  'Optimizuj',
  'Provjeri',
  'Analiziraj',
  'Popravi',
  'Isprazni',
  'Premijesti u drugu bazu podataka',
  'Premijesti',
  'Umnoži',
  'overwrite',
  'Raspored',
  'U zadato vrijeme',
  'Ažuriraj tip',
];
		case "ca": return [
  '%.3f s',
  'Impossible adjuntar el fitxer.',
  'La mida màxima permesa del fitxer és de %sB.',
  'El fitxer no existeix.',
  ',',
  '0123456789',
  'Tipus de l\'usuari',
  'Estàs segur?',
  'Increase %s.',
  'La pujada de fitxers està desactivada.',
  'original',
  'No hi ha cap taula.',
  'Edita',
  'Insereix',
  'No hi ha cap registre.',
  'You have no privileges to update this table.',
  'Desa',
  'Desa i segueix editant',
  'Desa i insereix el següent',
  'Saving',
  'Suprimeix',
  'Idioma',
  'Utilitza',
  'Unknown error.',
  'Sistema',
  'Servidor',
  'hostname[:port] or :socket',
  'Nom d\'usuari',
  'Contrasenya',
  'Base de dades',
  'Inicia la sessió',
  'Sessió permanent',
  'Adminer does not support accessing a database without a password, <a href="https://www.adminer.org/en/password/"%s>more information</a>.',
  'Selecciona dades',
  'Mostra l\'estructura',
  'Modifica la vista',
  'Modifica la taula',
  'Nou element',
  'Warnings',
  [
    '%d byte',
    '%d bytes',
  ],
  'Columna',
  'Tipus',
  'Comentari',
  'Increment automàtic',
  'Default value',
  'Selecciona',
  'Funcions',
  'Agregació',
  'Cerca',
  'a qualsevol lloc',
  'Ordena',
  'descendent',
  'Límit',
  'Longitud del text',
  'Acció',
  'Full table scan',
  'Ordre SQL',
  'obre',
  'desa',
  'Modifica la base de dades',
  'Modifica l\'esquema',
  'Crea un esquema',
  'Esquema de la base de dades',
  'Privilegis',
  'Rutines',
  'Seqüències',
  'Events',
  'Importa',
  'Exporta',
  'Crea una taula',
  'DB',
  'registres',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  'Disable %s or enable %s or %s extensions.',
  'Nombres',
  'Data i hora',
  'Cadenes',
  'Llistes',
  'Binari',
  'Geometria',
  'ltr',
  'You are offline.',
  'Desconnecta',
  'Too many unsuccessful logins, try again in %d minute(s).',
  'Desconnexió correcta.',
  'Thanks for using Adminer, consider <a href="https://www.adminer.org/en/donation/">donating</a>.',
  'La sessió ha expirat, torna a iniciar-ne una.',
  'Master password expired. <a href="https://www.adminer.org/en/extension/"%s>Implement</a> %s method to make it permanent.',
  'Cal que estigui permès l\'us de sessions.',
  'The action will be performed after successful login with the same credentials.',
  'Cap extensió',
  'No hi ha cap de les extensions PHP suportades (%s) disponible.',
  'Connecting to privileged ports is not allowed.',
  'Credencials invàlides.',
  'There is a space in the input password which might be the cause.',
  'Token CSRF invàlid. Torna a enviar el formulari.',
  'S\'ha assolit el nombre màxim de camps. Incrementa %s.',
  'If you did not send this request from Adminer then close this page.',
  'Les dades POST són massa grans. Redueix les dades o incrementa la directiva de configuració %s.',
  'You can upload a big SQL file via FTP and import it from server.',
  'Claus foranes',
  'compaginació',
  'ON UPDATE',
  'ON DELETE',
  'Nom de la columna',
  'Nom del paràmetre',
  'Llargada',
  'Opcions',
  'Afegeix el següent',
  'Mou a dalt',
  'Mou a baix',
  'Suprimeix',
  'Base de dades invàlida.',
  'S\'han suprimit les bases de dades.',
  'Selecciona base de dades',
  'Crea una base de dades',
  'Llista de processos',
  'Variables',
  'Estat',
  'Versió %s: %s amb l\'extensió de PHP %s',
  'Connectat com a: %s',
  'Refresca',
  'Compaginació',
  'Taules',
  'Size',
  'Compute',
  'Selected',
  'Suprimeix',
  'Loaded plugins',
  'screenshot',
  'Materialized view',
  'Vista',
  'Taula',
  'Inherits from',
  'Índexs',
  'Modifica els índex',
  'Font',
  'Destí',
  'Modifica',
  'Afegeix una clau forana',
  'Checks',
  'Create check',
  'Activadors',
  'Afegeix un activador',
  'Inherited by',
  'Enllaç permanent',
  'Sortida',
  'Format',
  'Dades',
  'Crea un usuari',
  'ATTACH queries are not supported.',
  'Error en la consulta',
  '%d / ',
  [
    '%d registre',
    '%d registres',
  ],
  [
    'Consulta executada correctament, %d registre modificat.',
    'Consulta executada correctament, %d registres modificats.',
  ],
  'Cap comanda per executar.',
  [
    '%d consulta executada correctament.',
    '%d consultes executades correctament.',
  ],
  'Executa',
  'Limit rows',
  'Adjunta un fitxer',
  'En el servidor',
  'Fitxer %s del servidor web',
  'Executa el fitxer',
  'Atura en trobar un error',
  'Mostra només els errors',
  'Història',
  'Suprimeix',
  'Edita-ho tot',
  'S\'ha suprimit l\'element.',
  'S\'ha actualitzat l\'element.',
  'S\'ha insertat l\'element%s.',
  'S\'ha suprimit la taula.',
  'S\'ha modificat la taula.',
  'S\'ha creat la taula.',
  'Nom de la taula',
  'motor',
  'Valors per defecte',
  'Drop %s?',
  'Fes particions segons',
  'Particions',
  'Nom de la partició',
  'Valors',
  'S\'han modificat els índex.',
  'Tipus d\'índex',
  'Algorithm',
  'Columns',
  'longitud',
  'Nom',
  'Condition',
  'S\'ha suprimit la base de dades.',
  'S\'ha canviat el nom de la base de dades.',
  'S\'ha creat la base de dades.',
  'S\'ha modificat la base de dades.',
  'Crida',
  [
    'S\'ha cridat la rutina, %d registre modificat.',
    'S\'ha cridat la rutina, %d registres modificats.',
  ],
  'S\'ha suprimit la clau forana.',
  'S\'ha modificat la clau forana.',
  'S\'ha creat la clau forana.',
  'Les columnes d\'origen i de destinació han de ser del mateix tipus, la columna de destinació ha d\'estar indexada i les dades referenciades han d\'existir.',
  'Clau forana',
  'Taula de destinació',
  'Canvi',
  'Afegeix una columna',
  'S\'ha modificat la vista.',
  'S\'ha suprimit la vista.',
  'S\'ha creat la vista.',
  'Crea una vista',
  'S\'ha suprimit l\'event.',
  'S\'ha modificat l\'event.',
  'S\'ha creat l\'event.',
  'Modifica l\'event',
  'Crea un event',
  'Comença',
  'Acaba',
  'Cada',
  'Conservar en completar',
  'S\'ha suprimit la rutina.',
  'S\'ha modificat la rutina.',
  'S\'ha creat la rutina.',
  'Modifica la funció',
  'Modifica el procediment',
  'Crea una funció',
  'Crea un procediment',
  'Tipus retornat',
  'Check has been dropped.',
  'Check has been altered.',
  'Check has been created.',
  'Alter check',
  'S\'ha suprimit l\'activador.',
  'S\'ha modificat l\'activador.',
  'S\'ha creat l\'activador.',
  'Modifica l\'activador',
  'Crea un activador',
  'Temps',
  'Event',
  'S\'ha suprimit l\'usuari.',
  'S\'ha modificat l\'usuari.',
  'S\'ha creat l\'usuari.',
  'Hashed',
  'Rutina',
  'Grant',
  'Revoke',
  [
    'S\'ha aturat %d procés.',
    'S\'han aturat %d processos.',
  ],
  'Clona',
  '%d en total',
  'Atura',
  [
    'S\'ha modificat %d element.',
    'S\'han modificat %d elements.',
  ],
  'Fes un Ctrl+clic a un valor per modificar-lo.',
  'File must be in UTF-8 encoding.',
  [
    'S\'ha importat %d registre.',
    'S\'han importat %d registres.',
  ],
  'Impossible seleccionar la taula',
  'Modify',
  'Relacions',
  'edita',
  'Utilitza l\'enllaç d\'edició per modificar aquest valor.',
  'Load more data',
  'Loading',
  'Plana',
  'darrera',
  'Tots els resultats',
  'S\'han escapçat les taules.',
  'S\'han desplaçat les taules.',
  'S\'han copiat les taules.',
  'S\'han suprimit les taules.',
  'Tables have been optimized.',
  'Esquema',
  'Taules i vistes',
  'Cerca dades en les taules',
  'Motor',
  'Longitud de les dades',
  'Longitud de l\'índex',
  'Espai lliure',
  'Files',
  'Vacuum',
  'Optimitza',
  'Verifica',
  'Analitza',
  'Repara',
  'Escapça',
  'Desplaça a una altra base de dades',
  'Desplaça',
  'Còpia',
  'overwrite',
  'Horari',
  'A un moment donat',
  'HH:MM:SS',
];
		case "cs": return [
  '%.3f s',
  'Nepodařilo se nahrát soubor.',
  'Maximální povolená velikost souboru je %sB.',
  'Soubor neexistuje.',
  ' ',
  '0123456789',
  'Uživatelské typy',
  'Opravdu?',
  'Zvyšte %s.',
  'Nahrávání souborů není povoleno.',
  'původní',
  'Žádné tabulky.',
  'Upravit',
  'Vložit',
  'Žádné řádky.',
  'Nemáte oprávnění editovat tuto tabulku.',
  'Uložit',
  'Uložit a pokračovat v editaci',
  'Uložit a vložit další',
  'Ukládá se',
  'Smazat',
  'Jazyk',
  'Vybrat',
  'Neznámá chyba.',
  'Systém',
  'Server',
  'hostname[:port] nebo :socket',
  'Uživatel',
  'Heslo',
  'Databáze',
  'Přihlásit se',
  'Trvalé přihlášení',
  'Adminer nepodporuje přístup k databázi bez hesla, <a href="https://www.adminer.org/cs/password/"%s>více informací</a>.',
  'Vypsat data',
  'Zobrazit strukturu',
  'Pozměnit pohled',
  'Pozměnit tabulku',
  'Nová položka',
  'Varování',
  [
    '%d bajt',
    '%d bajty',
    '%d bajtů',
  ],
  'Sloupec',
  'Typ',
  'Komentář',
  'Auto Increment',
  'Výchozí hodnota',
  'Vypsat',
  'Funkce',
  'Agregace',
  'Vyhledat',
  'kdekoliv',
  'Seřadit',
  'sestupně',
  'Limit',
  'Délka textů',
  'Akce',
  'Průchod celé tabulky',
  'SQL příkaz',
  'otevřít',
  'uložit',
  'Pozměnit databázi',
  'Pozměnit schéma',
  'Vytvořit schéma',
  'Schéma databáze',
  'Oprávnění',
  'Procedury a funkce',
  'Sekvence',
  'Události',
  'Import',
  'Export',
  'Vytvořit tabulku',
  'DB',
  'vypsat',
  '%s musí <a%s>vracet pole</a>.',
  '<a%s>Nakonfigurujte</a> %s v %s.',
  'Zakažte %s nebo povolte rozšíření %s nebo %s.',
  'Čísla',
  'Datum a čas',
  'Řetězce',
  'Seznamy',
  'Binární',
  'Geometrie',
  'ltr',
  'Jste offline.',
  'Odhlásit',
  [
    'Příliš mnoho pokusů o přihlášení, zkuste to znovu za %d minutu.',
    'Příliš mnoho pokusů o přihlášení, zkuste to znovu za %d minuty.',
    'Příliš mnoho pokusů o přihlášení, zkuste to znovu za %d minut.',
  ],
  'Odhlášení proběhlo v pořádku.',
  'Díky za použití Admineru, <a href="https://www.adminer.org/cs/donation/">přispějte</a> na vývoj.',
  'Session vypršela, přihlaste se prosím znovu.',
  'Platnost hlavního hesla vypršela. <a href="https://www.adminer.org/cs/extension/"%s>Implementujte</a> metodu %s, aby platilo stále.',
  'Session proměnné musí být povolené.',
  'Akce bude provedena po úspěšném přihlášení se stejnými přihlašovacími údaji.',
  'Žádné rozšíření',
  'Není dostupné žádné z podporovaných PHP rozšíření (%s).',
  'Připojování k privilegovaným portům není povoleno.',
  'Neplatné přihlašovací údaje.',
  'Problém může být, že je v zadaném hesle mezera.',
  'Neplatný token CSRF. Odešlete formulář znovu.',
  'Byl překročen maximální povolený počet polí. Zvyšte prosím %s.',
  'Pokud jste tento požadavek neposlali z Adminera, tak tuto stránku zavřete.',
  'Příliš velká POST data. Zmenšete data nebo zvyšte hodnotu konfigurační direktivy %s.',
  'Velký SQL soubor můžete nahrát pomocí FTP a importovat ho ze serveru.',
  'Cizí klíče',
  'porovnávání',
  'Při změně',
  'Při smazání',
  'Název sloupce',
  'Název parametru',
  'Délka',
  'Volby',
  'Přidat další',
  'Přesunout nahoru',
  'Přesunout dolů',
  'Odebrat',
  'Nesprávná databáze.',
  'Databáze byly odstraněny.',
  'Vybrat databázi',
  'Vytvořit databázi',
  'Seznam procesů',
  'Proměnné',
  'Stav',
  'Verze %s: %s přes PHP rozšíření %s',
  'Přihlášen jako: %s',
  'Obnovit',
  'Porovnávání',
  'Tabulky',
  'Velikost',
  'Spočítat',
  'Označené',
  'Odstranit',
  'Nahrané pluginy',
  'obrázek',
  'Materializovaný pohled',
  'Pohled',
  'Tabulka',
  'Zděděná z',
  'Indexy',
  'Pozměnit indexy',
  'Zdroj',
  'Cíl',
  'Změnit',
  'Přidat cizí klíč',
  'Kontroly',
  'Vytvořit kontrolu',
  'Triggery',
  'Přidat trigger',
  'Zděděné',
  'Trvalý odkaz',
  'Výstup',
  'Formát',
  'Data',
  'Vytvořit uživatele',
  'Dotazy ATTACH nejsou podporované.',
  'Chyba v dotazu',
  '%d / ',
  [
    '%d řádek',
    '%d řádky',
    '%d řádků',
  ],
  [
    'Příkaz proběhl v pořádku, byl změněn %d záznam.',
    'Příkaz proběhl v pořádku, byly změněny %d záznamy.',
    'Příkaz proběhl v pořádku, bylo změněno %d záznamů.',
  ],
  'Žádné příkazy k vykonání.',
  [
    '%d příkaz proběhl v pořádku.',
    '%d příkazy proběhly v pořádku.',
    '%d příkazů proběhlo v pořádku.',
  ],
  'Provést',
  'Limit řádek',
  'Nahrání souboru',
  'Ze serveru',
  'Soubor %s na webovém serveru',
  'Spustit soubor',
  'Zastavit při chybě',
  'Zobrazit pouze chyby',
  'Historie',
  'Vyčistit',
  'Upravit vše',
  'Položka byla smazána.',
  'Položka byla aktualizována.',
  'Položka%s byla vložena.',
  'Tabulka byla odstraněna.',
  'Tabulka byla změněna.',
  'Tabulka byla vytvořena.',
  'Název tabulky',
  'úložiště',
  'Výchozí hodnoty',
  'Odstranit %s?',
  'Rozdělit podle',
  'Oddíly',
  'Název oddílu',
  'Hodnoty',
  'Indexy byly změněny.',
  'Typ indexu',
  'Algoritmus',
  'Sloupce',
  'délka',
  'Název',
  'Podmínka',
  'Databáze byla odstraněna.',
  'Databáze byla přejmenována.',
  'Databáze byla vytvořena.',
  'Databáze byla změněna.',
  'Zavolat',
  [
    'Procedura byla zavolána, byl změněn %d záznam.',
    'Procedura byla zavolána, byly změněny %d záznamy.',
    'Procedura byla zavolána, bylo změněno %d záznamů.',
  ],
  'Cizí klíč byl odstraněn.',
  'Cizí klíč byl změněn.',
  'Cizí klíč byl vytvořen.',
  'Zdrojové a cílové sloupce musí mít stejný datový typ, nad cílovými sloupci musí být definován index a odkazovaná data musí existovat.',
  'Cizí klíč',
  'Cílová tabulka',
  'Změnit',
  'Přidat sloupec',
  'Pohled byl změněn.',
  'Pohled byl odstraněn.',
  'Pohled byl vytvořen.',
  'Vytvořit pohled',
  'Událost byla odstraněna.',
  'Událost byla změněna.',
  'Událost byla vytvořena.',
  'Pozměnit událost',
  'Vytvořit událost',
  'Začátek',
  'Konec',
  'Každých',
  'Po dokončení zachovat',
  'Procedura byla odstraněna.',
  'Procedura byla změněna.',
  'Procedura byla vytvořena.',
  'Změnit funkci',
  'Změnit proceduru',
  'Vytvořit funkci',
  'Vytvořit proceduru',
  'Návratový typ',
  'Kontrola byla odstraněna.',
  'Kontrola byla změněna.',
  'Kontrola byla vytvořena.',
  'Změnit kontrolu',
  'Trigger byl odstraněn.',
  'Trigger byl změněn.',
  'Trigger byl vytvořen.',
  'Změnit trigger',
  'Vytvořit trigger',
  'Čas',
  'Událost',
  'Uživatel byl odstraněn.',
  'Uživatel byl změněn.',
  'Uživatel byl vytvořen.',
  'Zahašované',
  'Procedura',
  'Povolit',
  'Zakázat',
  [
    'Byl ukončen %d proces.',
    'Byly ukončeny %d procesy.',
    'Bylo ukončeno %d procesů.',
  ],
  'Klonovat',
  '%d celkem',
  'Ukončit',
  [
    'Byl ovlivněn %d záznam.',
    'Byly ovlivněny %d záznamy.',
    'Bylo ovlivněno %d záznamů.',
  ],
  'Ctrl+klikněte na políčko, které chcete změnit.',
  'Soubor musí být v kódování UTF-8.',
  [
    'Byl importován %d záznam.',
    'Byly importovány %d záznamy.',
    'Bylo importováno %d záznamů.',
  ],
  'Nepodařilo se vypsat tabulku',
  'Změnit',
  'Vztahy',
  'upravit',
  'Ke změně této hodnoty použijte odkaz upravit.',
  'Načíst další data',
  'Načítá se',
  'Stránka',
  'poslední',
  'Celý výsledek',
  'Tabulky byly vyprázdněny.',
  'Tabulky byly přesunuty.',
  'Tabulky byly zkopírovány.',
  'Tabulky byly odstraněny.',
  'Tabulky byly optimalizovány.',
  'Schéma',
  'Tabulky a pohledy',
  'Vyhledat data v tabulkách',
  'Úložiště',
  'Velikost dat',
  'Velikost indexů',
  'Volné místo',
  'Řádků',
  'Vyčistit',
  'Optimalizovat',
  'Zkontrolovat',
  'Analyzovat',
  'Opravit',
  'Vyprázdnit',
  'Přesunout do jiné databáze',
  'Přesunout',
  'Zkopírovat',
  'přepsat',
  'Plán',
  'V daný čas',
  'Pozměnit typ',
];
		case "da": return [
  '%.3f s',
  'Kunne ikke uploade fil.',
  'Maksimum tilladte filstørrelse er %sB.',
  'Filen eksisterer ikke.',
  ' ',
  '0123456789',
  'Brugertyper',
  'Er du sikker?',
  'Increase %s.',
  'Fil upload er slået fra.',
  'original',
  'Ingen tabeller.',
  'Rediger',
  'Indsæt',
  'Ingen rækker.',
  'Du mangler rettigheder til at ændre denne tabellen.',
  'Gem',
  'Gem og fortsæt redigering',
  'Gem og indsæt næste',
  'Gemmer',
  'Slet',
  'Sprog',
  'Brug',
  'Unknown error.',
  'System',
  'Server',
  'hostname[:port] or :socket',
  'Brugernavn',
  'Kodeord',
  'Database',
  'Log ind',
  'Permanent login',
  'Adminer does not support accessing a database without a password, <a href="https://www.adminer.org/en/password/"%s>more information</a>.',
  'Vælg data',
  'Vis struktur',
  'Ændre view',
  'Ændre tabel',
  'Nyt emne',
  'Warnings',
  [
    '%d byte',
    '%d bytes',
  ],
  'Kolonne',
  'Type',
  'Kommentarer',
  'Auto Increment',
  'Default value',
  'Vælg',
  'Funktioner',
  'Sammenfatning',
  'Søg',
  'hvorsomhelst',
  'Sorter',
  'faldende',
  'Limit',
  'Tekstlængde',
  'Handling',
  'Fuld tabel-scan',
  'SQL-kommando',
  'Åben',
  'Gem',
  'Ændre database',
  'Ændre skema',
  'Opret skema',
  'Databaseskema',
  'Privilegier',
  'Rutiner',
  'Sekvenser',
  'Hændelser',
  'Importer',
  'Eksport',
  'Opret tabel',
  'DB',
  'Vis',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  'Disable %s or enable %s or %s extensions.',
  'Nummer',
  'Dato og tid',
  'Strenge',
  'Lister',
  'Binær',
  'Geometri',
  'ltr',
  'You are offline.',
  'Log ud',
  'Too many unsuccessful logins, try again in %d minute(s).',
  'Log af vellykket.',
  'Thanks for using Adminer, consider <a href="https://www.adminer.org/en/donation/">donating</a>.',
  'Sessionen er udløbet - Log venligst ind igen.',
  'Master-kodeordet er udløbet. <a href="https://www.adminer.org/en/extension/"%s>Implementer</a> en metode for %s for at gøre det permanent.',
  'Session support skal være slået til.',
  'The action will be performed after successful login with the same credentials.',
  'Ingen udvidelse',
  'Ingen af de understøttede PHP-udvidelser (%s) er tilgængelige.',
  'Connecting to privileged ports is not allowed.',
  'Ugyldige log ind oplysninger.',
  'There is a space in the input password which might be the cause.',
  'Ugyldigt CSRF-token - Genindsend formen.',
  'Maksimum antal feltnavne overskredet - øg venligst %s.',
  'If you did not send this request from Adminer then close this page.',
  'Maks POST data er overskredet. Reducer mængden af data eller øg størrelsen i %s-konfigurationen.',
  'Du kan uploade en stor SQL-fil via FTP og importere den fra serveren.',
  'Fremmednøgler',
  'sortering',
  'ON UPDATE',
  'ON DELETE',
  'Kolonnenavn',
  'Parameternavn',
  'Længde',
  'Valg',
  'Læg til næste',
  'Flyt op',
  'Flyt ned',
  'Fjern',
  'Ugyldig database.',
  'Databasene er blevet slettet.',
  'Vælg database',
  'Opret database',
  'Procesliste',
  'Variabler',
  'Status',
  '%s version: %s via PHP-udvidelse %s',
  'Logget ind som: %s',
  'Genindlæs',
  'Tekstsortering',
  'Tabeller',
  'Size',
  'Compute',
  'Valgt',
  'Drop',
  'Loaded plugins',
  'screenshot',
  'Materialized view',
  'View',
  'Tabel',
  'Inherits from',
  'Indekser',
  'Ændre indekser',
  'Kilde',
  'Mål',
  'Ændre',
  'Tilføj fremmednøgle',
  'Checks',
  'Create check',
  'Triggere',
  'Tilføj trigger',
  'Inherited by',
  'Permanent link',
  'Resultat',
  'Format',
  'Data',
  'Opret bruger',
  'ATTACH queries are not supported.',
  'Fejl i forespørgelse',
  '%d / ',
  [
    '%d række',
    '%d rækker',
  ],
  [
    'Kald udført OK, %d række påvirket.',
    'Kald udført OK, %d rækker påvirket.',
  ],
  'Ingen kommandoer at udføre.',
  [
    '%d kald udført OK.',
    '%d kald udført OK.',
  ],
  'Kør',
  'Limit rows',
  'Fil upload',
  'Fra server',
  'Webserver-fil %s',
  'Kør fil',
  'Stop ved fejl',
  'Vis kun fejl',
  'Historik',
  'Tøm',
  'Rediger alle',
  'Emnet er slettet.',
  'Emnet er opdateret.',
  'Emne%s er sat ind.',
  'Tabellen er slettet.',
  'Tabellen er ændret.',
  'Tabellen er oprettet.',
  'Tabelnavn',
  'motor',
  'Standardværdier',
  'Drop %s?',
  'Partition ved',
  'Partitioner',
  'Partitionsnavn',
  'Værdier',
  'Indekserne er ændret.',
  'Indekstype',
  'Algorithm',
  'Columns',
  'længde',
  'Navn',
  'Condition',
  'Databasen er blevet slettet.',
  'Databasen har fået nyt navn.',
  'Databasen er oprettet.',
  'Databasen er ændret.',
  'Kald',
  [
    'Rutinen er udført, %d række påvirket.',
    'Rutinen er udført, %d rækker påvirket.',
  ],
  'Fremmednøglen er slettet.',
  'Fremmednøglen er ændret.',
  'Fremmednøglen er oprettet.',
  'Kilde- og målkolonner skal have samme datatype, der skal være en indeks på mål-kolonnen, og data som refereres til skal eksistere.',
  'Fremmednøgle',
  'Måltabel',
  'Ændre',
  'Tilføj kolonne',
  'Viewet er ændret.',
  'Viewet er slettet.',
  'Viewet er oprettet.',
  'Nyt view',
  'Hændelsen er slettet.',
  'Hændelsen er ændret.',
  'Hændelsen er oprettet.',
  'Ændre hændelse',
  'Opret hændelse',
  'Start',
  'Slut',
  'Hver',
  'Ved fuldførelse bevar',
  'Rutinen er slettet.',
  'Rutinen er ændret.',
  'Rutinen er oprettet.',
  'Ændre funktion',
  'Ændre procedure',
  'Opret funktion',
  'Opret procedure',
  'Returtype',
  'Check has been dropped.',
  'Check has been altered.',
  'Check has been created.',
  'Alter check',
  'Triggeren er slettet.',
  'Triggeren er ændret.',
  'Triggeren er oprettet.',
  'Ændre trigger',
  'Opret trigger',
  'Tid',
  'Hændelse',
  'Brugeren slettet.',
  'Brugeren ændret.',
  'Brugeren oprettet.',
  'Hashet',
  'Rutine',
  'Giv privilegier',
  'Træk tilbage',
  [
    '%d proces afsluttet.',
    '%d processer afsluttet.',
  ],
  'Klon',
  '%d total',
  'Afslut',
  [
    '%d emne påvirket.',
    '%d emner påvirket.',
  ],
  'Ctrl+klik på en værdi for at ændre den.',
  'Filen skal være i UTF8-tegnkoding.',
  [
    '%d række er importeret.',
    '%d rækker er importeret.',
  ],
  'Kan ikke vælge tabellen',
  'Ændre',
  'Relationer',
  'rediger',
  'Brug rediger-link for at ændre dennne værdi.',
  'Indlæs mere data',
  'Indlæser',
  'Side',
  'sidste',
  'Hele resultatet',
  'Tabellerne er blevet afkortet.',
  'Tabellerne er blevet flyttet.',
  'Tabellerne er blevet kopiert.',
  'Tabellerne er slettet.',
  'Tabellerne er blevet optimaliseret.',
  'Skema',
  'Tabeller og views',
  'Søg data i tabeller',
  'Motor',
  'Datalængde',
  'Indekslængde',
  'Fri data',
  'Rader',
  'Støvsug',
  'Optimaliser',
  'Tjek',
  'Analyser',
  'Reparer',
  'Afkort',
  'Flyt til anden database',
  'Flyt',
  'Kopier',
  'overwrite',
  'Tidsplan',
  'På givne tid',
  'Ændre type',
];
		case "de": return [
  '%.3f s',
  'Hochladen von Datei fehlgeschlagen.',
  'Maximal erlaubte Dateigröße ist %sB.',
  'Datei existiert nicht.',
  ' ',
  '0123456789',
  'Benutzerdefinierte Typen',
  'Sind Sie sicher?',
  'Increase %s.',
  'Importieren von Dateien abgeschaltet.',
  'Original',
  'Keine Tabellen.',
  'Bearbeiten',
  'Einfügen',
  'Keine Datensätze.',
  'Sie haben keine Rechte, diese Tabelle zu aktualisieren.',
  'Speichern',
  'Speichern und weiter bearbeiten',
  'Speichern und nächsten einfügen',
  'Speichere',
  'Entfernen',
  'Sprache',
  'Auswählen',
  'Unbekannter Fehler.',
  'Datenbank System',
  'Server',
  'hostname[:port] or :socket',
  'Benutzer',
  'Passwort',
  'Datenbank',
  'Login',
  'Passwort speichern',
  'Adminer unterstützt den Zugriff auf eine Datenbank ohne Passwort nicht, <a href="https://www.adminer.org/de/password/"%s>mehr Informationen</a>.',
  'Daten auswählen',
  'Struktur anzeigen',
  'View ändern',
  'Tabelle ändern',
  'Neuer Datensatz',
  'Warnungen',
  [
    '%d Byte',
    '%d Bytes',
  ],
  'Spalte',
  'Typ',
  'Kommentar',
  'Auto-Inkrement',
  'Vorgabewert festlegen',
  'Daten zeigen von',
  'Funktionen',
  'Aggregationen',
  'Suchen',
  'beliebig',
  'Ordnen',
  'absteigend',
  'Begrenzung',
  'Textlänge',
  'Aktion',
  'Vollständige Überprüfung der Tabelle',
  'SQL-Kommando',
  'anzeigen',
  'Datei',
  'Datenbank ändern',
  'Schema ändern',
  'Schema erstellen',
  'Datenbankschema',
  'Rechte',
  'Routinen',
  'Sequenzen',
  'Ereignisse',
  'Importieren',
  'Exportieren',
  'Tabelle erstellen',
  'DB',
  'zeigen',
  '%s muss <a%s>ein Array zurückgeben</a>.',
  '<a%s>Konfigure</a> %s mit %s.',
  'Deaktivieren Sie %s oder aktivieren Sie die Erweiterungen %s oder %s.',
  'Zahlen',
  'Datum und Zeit',
  'Zeichenketten',
  'Listen',
  'Binär',
  'Geometrie',
  'ltr',
  'Sie sind offline.',
  'Abmelden',
  [
    'Zu viele erfolglose Login-Versuche. Bitte probieren Sie es in %d Minute noch einmal.',
    'Zu viele erfolglose Login-Versuche. Bitte probieren Sie es in %d Minuten noch einmal.',
  ],
  'Abmeldung erfolgreich.',
  'Danke, dass Sie Adminer genutzt haben. <a href="https://www.adminer.org/de/donation/">Spenden willkommen!</a>.',
  'Sitzungsdauer abgelaufen, bitte erneut anmelden.',
  'Das Master-Passwort ist abgelaufen. <a href="https://www.adminer.org/de/extension/"%s>Implementieren</a> Sie die %s Methode, um es permanent zu machen.',
  'Unterstüzung für PHP-Sessions muss aktiviert sein.',
  'Die Aktion wird nach erfolgreicher Anmeldung mit denselben Anmeldedaten ausgeführt.',
  'Keine Erweiterungen installiert',
  'Keine der unterstützten PHP-Erweiterungen (%s) ist vorhanden.',
  'Die Verbindung zu privilegierten Ports ist nicht erlaubt.',
  'Ungültige Anmelde-Informationen.',
  'Es gibt ein Leerzeichen im Eingabepasswort, das die Ursache sein könnte.',
  'CSRF Token ungültig. Bitte die Formulardaten erneut abschicken.',
  'Die maximal erlaubte Anzahl der Felder ist überschritten. Bitte %s erhöhen.',
  'Wenn Sie diese Anfrage nicht von Adminer gesendet haben, schließen Sie diese Seite.',
  'POST-Daten sind zu groß. Reduzieren Sie die Größe oder vergrößern Sie den Wert %s in der Konfiguration.',
  'Sie können eine große SQL-Datei per FTP hochladen und dann vom Server importieren.',
  'Fremdschlüssel',
  'Kollation',
  'ON UPDATE',
  'ON DELETE',
  'Spaltenname',
  'Name des Parameters',
  'Länge',
  'Optionen',
  'Hinzufügen',
  'Nach oben',
  'Nach unten',
  'Entfernen',
  'Datenbank ungültig.',
  'Datenbanken wurden entfernt.',
  'Datenbank auswählen',
  'Datenbank erstellen',
  'Prozessliste',
  'Variablen',
  'Status',
  'Version %s: %s mit PHP-Erweiterung %s',
  'Angemeldet als: %s',
  'Aktualisieren',
  'Kollation',
  'Tabellen',
  'Größe',
  'kalkulieren',
  'Ausgewählte',
  'Entfernen',
  'Geladene Plugins',
  'Screenshot',
  'Strukturierte Ansicht',
  'View',
  'Tabelle',
  'Inherits from',
  'Indizes',
  'Indizes ändern',
  'Ursprung',
  'Ziel',
  'Ändern',
  'Fremdschlüssel hinzufügen',
  'Checks',
  'Check erstellen',
  'Trigger',
  'Trigger hinzufügen',
  'Inherited by',
  'Dauerhafter Link',
  'Ergebnis',
  'Format',
  'Daten',
  'Benutzer erstellen',
  'ATTACH Abfragen werden nicht unterstützt.',
  'Fehler in der SQL-Abfrage',
  '%d / ',
  [
    '%d Datensatz',
    '%d Datensätze',
  ],
  [
    'Abfrage ausgeführt, %d Datensatz betroffen.',
    'Abfrage ausgeführt, %d Datensätze betroffen.',
  ],
  'Kein Kommando vorhanden.',
  [
    'SQL-Abfrage erfolgreich ausgeführt.',
    '%d SQL-Abfragen erfolgreich ausgeführt.',
  ],
  'Ausführen',
  'Datensätze begrenzen',
  'Datei importieren',
  'Vom Server',
  'Webserver Datei %s',
  'Datei ausführen',
  'Bei Fehler anhalten',
  'Nur Fehler anzeigen',
  'History',
  'Löschen',
  'Alle bearbeiten',
  'Datensatz wurde gelöscht.',
  'Datensatz wurde geändert.',
  'Datensatz%s wurde eingefügt.',
  'Tabelle wurde entfernt.',
  'Tabelle wurde geändert.',
  'Tabelle wurde erstellt.',
  'Name der Tabelle',
  'Speicher-Engine',
  'Vorgabewerte festlegen',
  '%s entfernen?',
  'Partitionieren um',
  'Partitionen',
  'Name der Partition',
  'Werte',
  'Indizes geändert.',
  'Index-Typ',
  'Algorithm',
  'Spalten',
  'Länge',
  'Name',
  'Condition',
  'Datenbank wurde entfernt.',
  'Datenbank wurde umbenannt.',
  'Datenbank wurde erstellt.',
  'Datenbank wurde geändert.',
  'Aufrufen',
  [
    'Routine wurde ausgeführt, %d Datensatz betroffen.',
    'Routine wurde ausgeführt, %d Datensätze betroffen.',
  ],
  'Fremdschlüssel wurde entfernt.',
  'Fremdschlüssel wurde geändert.',
  'Fremdschlüssel wurde erstellt.',
  'Quell- und Zielspalten müssen vom gleichen Datentyp sein, es muss unter den Zielspalten ein Index existieren und die referenzierten Daten müssen existieren.',
  'Fremdschlüssel',
  'Zieltabelle',
  'Ändern',
  'Spalte hinzufügen',
  'View wurde geändert.',
  'View wurde entfernt.',
  'View wurde erstellt.',
  'View erstellen',
  'Ereignis wurde entfernt.',
  'Ereignis wurde geändert.',
  'Ereignis wurde erstellt.',
  'Ereignis ändern',
  'Ereignis erstellen',
  'Start',
  'Ende',
  'Jede',
  'Nach der Ausführung erhalten',
  'Routine wurde entfernt.',
  'Routine wurde geändert.',
  'Routine wurde erstellt.',
  'Funktion ändern',
  'Prozedur ändern',
  'Funktion erstellen',
  'Prozedur erstellen',
  'Typ des Rückgabewertes',
  'Check wurde abgebrochen.',
  'Check wurde geändert.',
  'Check wurde erstellt.',
  'Check ändern',
  'Trigger wurde entfernt.',
  'Trigger wurde geändert.',
  'Trigger wurde erstellt.',
  'Trigger ändern',
  'Trigger erstellen',
  'Zeitpunkt',
  'Ereignis',
  'Benutzer wurde entfernt.',
  'Benutzer wurde geändert.',
  'Benutzer wurde erstellt.',
  'Hashed',
  'Routine',
  'Erlauben',
  'Widerrufen',
  [
    '%d Prozess gestoppt.',
    '%d Prozesse gestoppt.',
  ],
  'Klonen',
  '%d insgesamt',
  'Anhalten',
  '%d Artikel betroffen.',
  'Ctrl+Klick zum Bearbeiten des Wertes.',
  'Die Datei muss UTF-8 kodiert sein.',
  [
    '%d Datensatz wurde importiert.',
    '%d Datensätze wurden importiert.',
  ],
  'Auswahl der Tabelle fehlgeschlagen',
  'Ändern',
  'Relationen',
  'bearbeiten',
  'Benutzen Sie den Link zum Bearbeiten dieses Wertes.',
  'Mehr Daten laden',
  'Lade',
  'Seite',
  'letzte',
  'Gesamtergebnis',
  'Tabellen wurden geleert (truncate).',
  'Tabellen verschoben.',
  'Tabellen wurden kopiert.',
  'Tabellen wurden entfernt (drop).',
  'Tabellen wurden optimiert.',
  'Schema',
  'Tabellen und Views',
  'Suche in Tabellen',
  'Speicher-Engine',
  'Datengröße',
  'Indexgröße',
  'Freier Bereich',
  'Datensätze',
  'Vacuum',
  'Optimieren',
  'Prüfen',
  'Analysieren',
  'Reparieren',
  'Leeren (truncate)',
  'In andere Datenbank verschieben',
  'Verschieben',
  'Kopieren',
  'überschreiben',
  'Zeitplan',
  'Zur angegebenen Zeit',
  'Die Datenbank unterstützt kein Passwort.',
];
		case "el": return [
  '%.3f s',
  'Αδυναμία μεταφόρτωσης αρχείου.',
  'Το μέγιστο επιτρεπόμενο μέγεθος αρχείου είναι %sB.',
  'Το αρχείο δεν υπάρχει.',
  '.',
  '0123456789',
  'Τύποι χρήστη',
  'Είστε σίγουρος;',
  'Increase %s.',
  'Έχει απενεργοποιηθεί η μεταφόρτωση αρχείων.',
  'πρωτότυπο',
  'Χωρίς πίνακες.',
  'Επεξεργασία',
  'Εισαγωγή',
  'Χωρίς σειρές.',
  'Δεν έχετε δικαίωμα να τροποποιήσετε αυτό τον πίνακα.',
  'Αποθήκευση',
  'Αποθήκευση και συνέχεια επεξεργασίας',
  'Αποθήκευση και εισαγωγή επόμενου',
  'Γίνεται Αποθήκευση',
  'Διαγραφή',
  'Γλώσσα',
  'χρήση',
  'Unknown error.',
  'Σύστημα',
  'Διακομιστής',
  'hostname[:port] or :socket',
  'Όνομα Χρήστη',
  'Κωδικός',
  'Β. Δεδομένων',
  'Σύνδεση',
  'Μόνιμη Σύνδεση',
  'Adminer does not support accessing a database without a password, <a href="https://www.adminer.org/en/password/"%s>more information</a>.',
  'Επιλέξτε δεδομένα',
  'Προβολή δομής',
  'Τροποποίηση προβολής',
  'Τροποποίηση πίνακα',
  'Νέα εγγραφή',
  'Warnings',
  [
    '%d byte',
    '%d bytes',
  ],
  'Στήλη',
  'Τύπος',
  'Σχόλιο',
  'Αυτόματη αρίθμηση',
  'Προεπιλεγμένη τιμή',
  'Επιλογή',
  'Λειτουργίες',
  'Άθροισμα',
  'Αναζήτηση',
  'παντού',
  'Ταξινόμηση',
  'Φθίνουσα',
  'Όριο',
  'Μήκος κειμένου',
  'Ενέργεια',
  'Πλήρης σάρωση πινάκων',
  'Εντολή SQL',
  'άνοιγμα',
  'αποθήκευση',
  'Τροποποίηση Β.Δ.',
  'Τροποποίηση σχήματος',
  'Δημιουργία σχήματος',
  'Σχήμα Β.Δ.',
  'Δικαιώματα',
  'Ρουτίνες',
  'Αλληλουχία',
  'Γεγονός',
  'Εισαγωγή',
  'Εξαγωγή',
  'Δημιουργία πίνακα',
  'DB',
  'επιλογή',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  'Disable %s or enable %s or %s extensions.',
  'Αριθμοί',
  'Ημερομηνία και ώρα',
  'Κείμενο',
  'Λίστες',
  'Δυαδικό',
  'Γεωμετρία',
  'ltr',
  'Βρίσκεστε εκτός σύνδεσης.',
  'Αποσύνδεση',
  [
    'Επανειλημμένες ανεπιτυχείς προσπάθειες σύνδεσης, δοκιμάστε ξανά σε %s λεπτό.',
    'Επανειλημμένες ανεπιτυχείς προσπάθειες σύνδεσης, δοκιμάστε ξανά σε %s λεπτά.',
  ],
  'Αποσυνδεθήκατε με επιτυχία.',
  'Thanks for using Adminer, consider <a href="https://www.adminer.org/en/donation/">donating</a>.',
  'Η συνεδρία έληξε, παρακαλώ συνδεθείτε ξανά.',
  'Έληξε ο Κύριος Κωδικός. <a href="https://www.adminer.org/en/extension/"%s>Ενεργοποιήστε</a> τη μέθοδο %s για να τον κάνετε μόνιμο.',
  'Πρέπει να είναι ενεργοποιημένη η υποστήριξη συνεδριών.',
  'The action will be performed after successful login with the same credentials.',
  'Καμία Επέκταση',
  'Καμία από τις υποστηριζόμενες επεκτάσεις PHP (%s) δεν είναι διαθέσιμη.',
  'Connecting to privileged ports is not allowed.',
  'Εσφαλμένα Διαπιστευτήρια.',
  'There is a space in the input password which might be the cause.',
  'Άκυρο κουπόνι CSRF. Στείλτε τη φόρμα ξανά.',
  'Υπέρβαση μέγιστου επιτρεπόμενου αριθμού πεδίων. Παρακαλώ αυξήστε %s.',
  'Αν δε στείλατε αυτό το αίτημα από το Adminer, τότε κλείστε αυτή τη σελίδα.',
  'Πολλά δεδομένα POST. Μείωστε τα περιεχόμενα ή αυξήστε την σχετική ρύθμιση %s.',
  'Μπορείτε να μεταφορτώσετε ένα μεγάλο αρχείο SQL μέσω FTP και να το εισάγετε από το διακομιστή.',
  'Εξαρτημένα κλειδιά',
  'collation',
  'ΚΑΤΑ ΤΗΝ ΑΛΛΑΓΗ',
  'ΚΑΤΑ ΤΗ ΔΙΑΓΡΑΦΗ',
  'Όνομα στήλης',
  'Όνομα παραμέτρου',
  'Μήκος',
  'Επιλογές',
  'Προσθήκη επόμενου',
  'Μετακίνηση προς τα επάνω',
  'Μετακίνηση προς τα κάτω',
  'Αφαίρεση',
  'Λανθασμένη Β.Δ.',
  'Οι Β.Δ. διαγράφηκαν.',
  'Επιλέξτε Β.Δ.',
  'Δημιουργία Β.Δ.',
  'Λίστα διεργασιών',
  'Μεταβλητές',
  'Κατάσταση',
  '%s έκδοση: %s μέσω επέκτασης PHP %s',
  'Συνδεθήκατε ως %s',
  'Ανανέωση',
  'Collation',
  'Πίνακες',
  'Μέγεθος',
  'Υπολογισμός',
  'Επιλεγμένα',
  'Διαγραφή',
  'Loaded plugins',
  'screenshot',
  'Υλοποιημένη προβολή',
  'Προβολή',
  'Πίνακας',
  'Inherits from',
  'Δείκτες',
  'Τροποποίηση δεικτών',
  'Πηγή',
  'Στόχος',
  'Τροποποίηση',
  'Προσθήκη εξαρτημένου κλειδιού',
  'Checks',
  'Create check',
  'Εναύσματα',
  'Προσθήκη εναύσματος',
  'Inherited by',
  'Μόνιμος Σύνδεσμος',
  'Αποτέλεσμα',
  'Μορφή',
  'Δεδομένα',
  'Δημιουργία Χρήστη',
  'ATTACH queries are not supported.',
  'Σφάλμα στο ερώτημα',
  '%d / ',
  [
    '%d σειρά',
    '%d σειρές',
  ],
  [
    'Το ερώτημα εκτελέστηκε ΟΚ, επηρεάστηκε %d σειρά.',
    'Το ερώτημα εκτελέστηκε ΟΚ, επηρεάστηκαν %d σειρές.',
  ],
  'Δεν υπάρχουν εντολές να εκτελεστούν.',
  [
    'Το ερώτημα %d εκτελέστηκε ΟΚ.',
    'Τα ερώτηματα %d εκτελέστηκαν ΟΚ.',
  ],
  'Εκτέλεση',
  'Περιορισμός σειρών',
  'Μεταφόρτωση αρχείου',
  'Από διακομιστή',
  'Αρχείο %s από διακομιστή web',
  'Εκτέλεση αρχείου',
  'Διακοπή όταν υπάρχει σφάλμα',
  'Να εμφανίζονται μόνο τα σφάλματα',
  'Ιστορικό',
  'Καθαρισμός',
  'Επεξεργασία όλων',
  'Η εγγραφή διαγράφηκε.',
  'Η εγγραφή ενημερώθηκε.',
  'Η εγγραφή%s εισήχθη.',
  'Ο πίνακας διαγράφηκε.',
  'Ο πίνακας τροποποιήθηκε.',
  'Ο πίνακας δημιουργήθηκε.',
  'Όνομα πίνακα',
  'μηχανή',
  'Προεπιλεγμένες τιμές',
  'Drop %s?',
  'Τμηματοποίηση ανά',
  'Τμήματα',
  'Όνομα Τμήματος',
  'Τιμές',
  'Οι δείκτες τροποποιήθηκαν.',
  'Τύπος δείκτη',
  'Algorithm',
  'Columns',
  'μήκος',
  'Όνομα',
  'Condition',
  'Η Β.Δ. διαγράφηκε.',
  'Η. Β.Δ. μετονομάστηκε.',
  'Η Β.Δ. δημιουργήθηκε.',
  'Η Β.Δ. τροποποιήθηκε.',
  'Εκτέλεση',
  [
    'Η ρουτίνα εκτελέστηκε, επηρεάστηκε %d σειρά.',
    'Η ρουτίνα εκτελέστηκε, επηρεάστηκαν %d σειρές.',
  ],
  'Το εξαρτημένο κλειδί διαγράφηκε.',
  'Το εξαρτημένο κλειδί τροποποιήθηκε.',
  'Το εξαρτημένο κλειδί δημιουργήθηκε.',
  'Οι στήλες στην πηγή και το στόχο πρέπει να έχουν τον ίδιο τύπο, πρέπει να υπάρχει δείκτης στη στήλη στόχο και να υπάρχουν εξαρτημένα δεδομένα.',
  'Εξαρτημένο κλειδί',
  'Πίνακας Στόχος',
  'Αλλαγή',
  'Προσθήκη στήλης',
  'Η προβολή τροποποιήθηκε.',
  'Η προβολή διαγράφηκε.',
  'Η προβολή δημιουργήθηκε.',
  'Δημιουργία προβολής',
  'Το γεγονός διαγράφηκε.',
  'Το γεγονός τροποποιήθηκε.',
  'Το γεγονός δημιουργήθηκε.',
  'Τροποποίηση γεγονότος',
  'Δημιουργία γεγονότος',
  'Έναρξη',
  'Λήξη',
  'Κάθε',
  'Κατά την ολοκλήρωση διατήρησε',
  'Η ρουτίνα διαγράφηκε.',
  'Η ρουτίνα τροποποιήθηκε.',
  'Η ρουτίνα δημιουργήθηκε.',
  'Τροποποίηση λειτουργίας',
  'Τροποποίηση διαδικασίας',
  'Δημιουργία Συνάρτησης',
  'Δημιουργία διαδικασίας',
  'Επιστρεφόμενος τύπος',
  'Check has been dropped.',
  'Check has been altered.',
  'Check has been created.',
  'Alter check',
  'Το έναυσμα διαγράφηκε.',
  'Το έναυσμα τροποποιήθηκε.',
  'Το έναυσμα δημιουργήθηκε.',
  'Τροποποίηση εναύσματος',
  'Δημιουργία εναύσματος',
  'Ώρα',
  'Γεγονός',
  'Ο Χρήστης διαγράφηκε.',
  'Ο Χρήστης τροποποιήθηκε.',
  'Ο Χρήστης δημιουργήθηκε.',
  'Κωδικοποιήθηκε',
  'Ρουτίνα',
  'Παραχώρηση',
  'Ανάκληση',
  [
    'Τερματίστηκε %d διεργασία.',
    'Τερματίστηκαν %d διεργασίες.',
  ],
  'Κλωνοποίηση',
  '%d συνολικά',
  'Τερματισμός',
  [
    'Επηρεάστηκε %d εγγραφή.',
    'Επηρεάστηκαν %d εγγραφές.',
  ],
  'Πιέστε Ctrl+click σε μια τιμή για να την τροποποιήσετε.',
  'Το αρχείο πρέπει να έχει κωδικοποίηση UTF-8.',
  [
    '$d σειρά εισήχθη.',
    '%d σειρές εισήχθησαν.',
  ],
  'Δεν είναι δυνατή η επιλογή πίνακα',
  'Τροποποίηση',
  'Συσχετήσεις',
  'επεξεργασία',
  'Χρησιμοποιήστε το σύνδεσμο επεξεργασία για να τροποποιήσετε την τιμή.',
  'Φόρτωση κι άλλων δεδομένων',
  'Φορτώνει',
  'Σελίδα',
  'τελευταία',
  'Όλο το αποτέλεσμα',
  'Οι πίνακες περικόπηκαν.',
  'Οι πίνακες μεταφέρθηκαν.',
  'Οι πίνακες αντιγράφηκαν.',
  'Οι πίνακες διαγράφηκαν.',
  'Οι πίνακες βελτιστοποιήθηκαν.',
  'Σχήμα',
  'Πίνακες και Προβολές',
  'Αναζήτηση δεδομένων στους πίνακες',
  'Μηχανή',
  'Μήκος Δεδομένων',
  'Μήκος Δείκτη',
  'Δεδομένα Ελεύθερα',
  'Σειρές',
  'Καθαρισμός',
  'Βελτιστοποίηση',
  'Έλεγχος',
  'Ανάλυση',
  'Επιδιόρθωση',
  'Περικοπή',
  'Μεταφορά σε άλλη Β.Δ.',
  'Μεταφορά',
  'Αντιγραφή',
  'overwrite',
  'Προγραμματισμός',
  'Σε προκαθορισμένο χρόνο',
  'Τροποποίηση τύπου',
];
		case "es": return [
  '%.3f s',
  'No es posible cargar el archivo.',
  'El tamaño máximo de archivo es %sB.',
  'Ese archivo no existe.',
  ' ',
  '0123456789',
  'Tipos definidos por el usuario',
  '¿Está seguro?',
  'Increase %s.',
  'Importación de archivos deshablilitada.',
  'original',
  'No existen tablas.',
  'Modificar',
  'Agregar',
  'No existen registros.',
  'Usted no tiene privilegios para actualizar esta tabla.',
  'Guardar',
  'Guardar y continuar editando',
  'Guardar e insertar siguiente',
  'Saving',
  'Eliminar',
  'Idioma',
  'Usar',
  'Error desconocido.',
  'Motor de base de datos',
  'Servidor',
  'hostname[:port] or :socket',
  'Usuario',
  'Contraseña',
  'Base de datos',
  'Login',
  'Guardar contraseña',
  'Adminer no soporta accesar una base de datos sin clave, <a href="https://www.adminer.org/en/password/"%s>Ver detalles</a>.',
  'Visualizar contenido',
  'Mostrar estructura',
  'Modificar vista',
  'Modificar tabla',
  'Nuevo Registro',
  'Advertencias',
  [
    '%d byte',
    '%d bytes',
  ],
  'Columna',
  'Tipo',
  'Comentario',
  'Incremento automático',
  'Default value',
  'Mostrar',
  'Funciones',
  'Agregados',
  'Condición',
  'donde sea',
  'Ordenar',
  'descendiente',
  'Limite',
  'Longitud de texto',
  'Acción',
  'Full table scan',
  'Comando SQL',
  'abrir',
  'guardar',
  'Modificar Base de datos',
  'Modificar esquema',
  'Crear esquema',
  'Esquema de base de datos',
  'Privilegios',
  'Procedimientos',
  'Secuencias',
  'Eventos',
  'Importar',
  'Exportar',
  'Crear tabla',
  'BD',
  'registros',
  '%s tiene que <a%s>retornar un arreglo</a>.',
  '<a%s>Configurar</a> %s en %s.',
  'Desactivar %s o activar %s o %s extensiones.',
  'Números',
  'Fecha y hora',
  'Cadena',
  'Listas',
  'Binario',
  'Geometría',
  'ltr',
  'Usted no esta en linea.',
  'Cerrar sesión',
  [
    'Muchos intentos de acceso Intente en %d minutos.',
  ],
  'Sesión finalizada con éxito.',
  'Thanks for using Adminer, consider <a href="https://www.adminer.org/en/donation/">donating</a>.',
  'Sesión caducada, por favor escriba su clave de nuevo.',
  'Password maestro expirado. <a href="https://www.adminer.org/en/extension/"%s>Implemente</a> %s metodo para hacerlo permanente.',
  'Deben estar habilitadas las sesiones.',
  'La operacion sera ejecutada despues de ingresar nuevamente con las mismas credenciales.',
  'No hay extensión',
  'Ninguna de las extensiones PHP soportadas (%s) está disponible.',
  'Conexiones a puertos privilegiados no son permitidas.',
  'Usuario y/o clave de acceso incorrecta.',
  'Hay un espacio en el password, lo cual puede ser la causa.',
  'Token CSRF inválido. Vuelva a enviar los datos del formulario.',
  'Excedida la cantidad máxima de campos permitidos. Por favor aumente %s.',
  'Si no puede enviar la solicitud por Adminer entonces cierre esta pagina.',
  'POST data demasiado grande. Reduzca el tamaño o aumente la directiva de configuración %s.',
  'Usted puede cargar un SQL grande mediante FTP e importarlo desde el servidor.',
  'Claves externas',
  'colación',
  'AL ACTUALIZAR',
  'AL BORRAR',
  'Nombre de columna',
  'Nombre de Parámetro',
  'Longitud',
  'Opciones',
  'Agregar',
  'Mover arriba',
  'Mover abajo',
  'Eliminar',
  'Base de datos incorrecta.',
  'Bases de datos eliminadas.',
  'Seleccionar Base de datos',
  'Crear Base de datos',
  'Lista de procesos',
  'Variables',
  'Estado',
  'Versión %s: %s a través de la extensión de PHP %s',
  'Logueado como: %s',
  'Actualizar',
  'Colación',
  'Tablas',
  'Size',
  'Compute',
  'Selected',
  'Eliminar',
  'Plugins cargados',
  'screenshot',
  'Vista materializada',
  'Vista',
  'Tabla',
  'Inherits from',
  'Índices',
  'Modificar índices',
  'Origen',
  'Destino',
  'Modificar',
  'Agregar clave externa',
  'Chequeos',
  'Crear chequeo',
  'Disparadores',
  'Agregar disparador',
  'Inherited by',
  'Enlace permanente',
  'Salida',
  'Formato',
  'Datos',
  'Crear Usuario',
  'Consultas tipo ATTACH no soportadas.',
  'Error al ejecutar consulta',
  '%d / ',
  [
    '%d registro',
    '%d registros',
  ],
  [
    'Consulta ejecutada, %d registro afectado.',
    'Consulta ejecutada, %d registros afectados.',
  ],
  'Ningún comando para ejecutar.',
  [
    '%d sentencia SQL ejecutada correctamente.',
    '%d sentencias SQL ejecutadas correctamente.',
  ],
  'Ejecutar',
  'Limit rows',
  'Importar archivo',
  'Desde servidor',
  'Archivo de servidor web %s',
  'Ejecutar Archivo',
  'Parar en caso de error',
  'Mostrar solamente errores',
  'Histórico',
  'Vaciar',
  'Editar todos',
  'Registro eliminado.',
  'Registro modificado.',
  'Registro%s insertado.',
  'Tabla eliminada.',
  'Tabla modificada.',
  'Tabla creada.',
  'Nombre de la tabla',
  'motor',
  'Valores predeterminados',
  'Drop %s?',
  'Particionar por',
  'Particiones',
  'Nombre de partición',
  'Valores',
  'Índices actualizados.',
  'Tipo de índice',
  'Algorithm',
  'Columns',
  'longitud',
  'Nombre',
  'Condition',
  'Base de datos eliminada.',
  'Base de datos renombrada.',
  'Base de datos creada.',
  'Base de datos modificada.',
  'Llamar',
  [
    'Consulta ejecutada, %d registro afectado.',
    'Consulta ejecutada, %d registros afectados.',
  ],
  'Clave foranea eliminada.',
  'Clave foranea modificada.',
  'Clave foranea creada.',
  'Las columnas de origen y destino deben ser del mismo tipo, debe existir un índice entre las columnas del destino y el registro referenciado debe existir también.',
  'Clave externa',
  'Tabla de destino',
  'Modificar',
  'Agregar columna',
  'Vista modificada.',
  'Vista eliminada.',
  'Vista creada.',
  'Crear vista',
  'Evento eliminado.',
  'Evento modificado.',
  'Evento creado.',
  'Modificar Evento',
  'Crear Evento',
  'Inicio',
  'Fin',
  'Cada',
  'Al completar mantener',
  'Procedimiento eliminado.',
  'Procedimiento modificado.',
  'Procedimiento creado.',
  'Modificar función',
  'Modificar procedimiento',
  'Crear función',
  'Crear procedimiento',
  'Tipo de valor de vuelta',
  'Chequeo eliminado.',
  'Chequeo cambiado.',
  'Chequeo creado.',
  'Cambiar chequeo',
  'Disparador eliminado.',
  'Disparador modificado.',
  'Disparador creado.',
  'Modificar Disparador',
  'Agregar Disparador',
  'Tiempo',
  'Evento',
  'Usuario eliminado.',
  'Usuario modificado.',
  'Usuario creado.',
  'Hash',
  'Rutina',
  'Conceder',
  'Impedir',
  [
    '%d proceso detenido.',
    '%d procesos detenidos.',
  ],
  'Clonar',
  '%d en total',
  'Detener',
  [
    '%d elemento afectado.',
    '%d elementos afectados.',
  ],
  'Ctrl+clic sobre el valor para editarlo.',
  'El archivo tiene que ser codificacion UTF-8.',
  [
    '%d registro importado.',
    '%d registros importados.',
  ],
  'No es posible seleccionar la tabla',
  'Modify',
  'Relaciones',
  'modificar',
  'Utilice el enlace de edición para realizar cambios.',
  'Load more data',
  'Loading',
  'Página',
  'último',
  'Resultado completo',
  'Las tablas han sido vaciadas.',
  'Se movieron las tablas.',
  'Tablas copiadas.',
  'Tablas eliminadas.',
  'Tables have been optimized.',
  'Esquema',
  'Tablas y vistas',
  'Buscar datos en tablas',
  'Motor',
  'Longitud de datos',
  'Longitud de índice',
  'Espacio libre',
  'Registros',
  'Vacuum',
  'Optimizar',
  'Comprobar',
  'Analizar',
  'Reparar',
  'Vaciar',
  'Mover a otra base de datos',
  'Mover',
  'Copiar',
  'overwrite',
  'Agenda',
  'En el momento indicado',
  'La base de datos no soporta password.',
];
		case "et": return [
  '%.3f s',
  'Faili üleslaadimine pole võimalik.',
  'Maksimaalne failisuurus %sB.',
  'Faili ei leitud.',
  ',',
  '0123456789',
  'Kasutajatüübid',
  'Kas oled kindel?',
  'Increase %s.',
  'Failide üleslaadimine on keelatud.',
  'originaal',
  'Tabeleid ei leitud.',
  'Muuda',
  'Sisesta',
  'Sissekanded puuduvad.',
  'You have no privileges to update this table.',
  'Salvesta',
  'Salvesta ja jätka muutmist',
  'Salvesta ja lisa järgmine',
  'Saving',
  'Kustuta',
  'Keel',
  'Kasuta',
  'Unknown error.',
  'Andmebaasimootor',
  'Server',
  'hostname[:port] or :socket',
  'Kasutajanimi',
  'Parool',
  'Andmebaas',
  'Logi sisse',
  'Jäta mind meelde',
  'Adminer does not support accessing a database without a password, <a href="https://www.adminer.org/en/password/"%s>more information</a>.',
  'Vaata andmeid',
  'Näita struktuuri',
  'Muuda vaadet (VIEW)',
  'Muuda tabeli struktuuri',
  'Lisa kirje',
  'Warnings',
  [
    '%d bait',
    '%d baiti',
  ],
  'Veerg',
  'Tüüp',
  'Kommentaar',
  'Automaatselt suurenev',
  'Default value',
  'Kuva',
  'Funktsioonid',
  'Liitmine',
  'Otsi',
  'vahet pole',
  'Sorteeri',
  'kahanevalt',
  'Piira',
  'Teksti pikkus',
  'Tegevus',
  'Full table scan',
  'SQL-Päring',
  'näita brauseris',
  'salvesta failina',
  'Muuda andmebaasi',
  'Muuda struktuuri',
  'Loo struktuur',
  'Andmebaasi skeem',
  'Õigused',
  'Protseduurid',
  'Jadad (sequences)',
  'Sündmused (EVENTS)',
  'Impordi',
  'Ekspordi',
  'Loo uus tabel',
  'DB',
  'kuva',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  'Disable %s or enable %s or %s extensions.',
  'Numbrilised',
  'Kuupäev ja kellaaeg',
  'Tekstid',
  'Listid',
  'Binaar',
  'Geomeetria',
  'ltr',
  'You are offline.',
  'Logi välja',
  'Too many unsuccessful logins, try again in %d minute(s).',
  'Väljalogimine õnnestus.',
  'Thanks for using Adminer, consider <a href="https://www.adminer.org/en/donation/">donating</a>.',
  'Sessioon on aegunud, palun logige uuesti sisse.',
  'Master password expired. <a href="https://www.adminer.org/en/extension/"%s>Implement</a> %s method to make it permanent.',
  'Sessioonid peavad olema lubatud.',
  'The action will be performed after successful login with the same credentials.',
  'Ei leitud laiendust',
  'Serveris pole ühtegi toetatud PHP laiendustest (%s).',
  'Connecting to privileged ports is not allowed.',
  'Ebakorrektsed andmed.',
  'There is a space in the input password which might be the cause.',
  'Sobimatu CSRF, palun postitage vorm uuesti.',
  'Maksimaalne väljade arv ületatud. Palun suurendage %s.',
  'If you did not send this request from Adminer then close this page.',
  'POST-andmete maht on liialt suur. Palun vähendage andmeid või suurendage %s php-seadet.',
  'You can upload a big SQL file via FTP and import it from server.',
  'Võõrvõtmed (foreign key)',
  'tähetabel',
  'ON UPDATE',
  'ON DELETE',
  'Veeru nimi',
  'Parameetri nimi',
  'Pikkus',
  'Valikud',
  'Lisa järgmine',
  'Liiguta ülespoole',
  'Liiguta allapoole',
  'Eemalda',
  'Tundmatu andmebaas.',
  'Andmebaasid on edukalt kustutatud.',
  'Vali andmebaas',
  'Loo uus andmebaas',
  'Protsesside nimekiri',
  'Muutujad',
  'Staatus',
  '%s versioon: %s, kasutatud PHP moodul: %s',
  'Sisse logitud: %s',
  'Uuenda',
  'Tähetabel',
  'Tabelid',
  'Size',
  'Compute',
  'Selected',
  'Kustuta',
  'Loaded plugins',
  'screenshot',
  'Materialized view',
  'Vaata',
  'Tabel',
  'Inherits from',
  'Indeksid',
  'Muuda indekseid',
  'Allikas',
  'Sihtkoht',
  'Muuda',
  'Lisa võõrvõti',
  'Checks',
  'Create check',
  'Päästikud (trigger)',
  'Lisa päästik (TRIGGER)',
  'Inherited by',
  'Püsilink',
  'Väljund',
  'Formaat',
  'Andmed',
  'Loo uus kasutaja',
  'ATTACH queries are not supported.',
  'Päringus esines viga',
  '%d / ',
  '%d rida',
  'Päring õnnestus, mõjutatatud ridu: %d.',
  'Käsk puudub.',
  [
    '%d päring edukalt käivitatud.',
    '%d päringut edukalt käivitatud.',
  ],
  'Käivita',
  'Limit rows',
  'Faili üleslaadimine',
  'Serverist',
  'Fail serveris: %s',
  'Käivita fail',
  'Peatuda vea esinemisel',
  'Kuva vaid veateateid',
  'Ajalugu',
  'Puhasta',
  'Muuda kõiki',
  'Kustutamine õnnestus.',
  'Uuendamine õnnestus.',
  'Kirje%s on edukalt lisatud.',
  'Tabel on edukalt kustutatud.',
  'Tabeli andmed on edukalt muudetud.',
  'Tabel on edukalt loodud.',
  'Tabeli nimi',
  'andmebaasimootor',
  'Vaikimisi väärtused',
  'Drop %s?',
  'Partitsiooni',
  'Partitsioonid',
  'Partitsiooni nimi',
  'Väärtused',
  'Indeksite andmed on edukalt uuendatud.',
  'Indeksi tüüp',
  'Algorithm',
  'Columns',
  'pikkus',
  'Nimi',
  'Condition',
  'Andmebaas on edukalt kustutatud.',
  'Andmebaas on edukalt ümber nimetatud.',
  'Andmebaas on edukalt loodud.',
  'Andmebaasi struktuuri uuendamine õnnestus.',
  'Käivita',
  'Protseduur täideti edukalt, mõjutatud ridu: %d.',
  'Võõrvõti on edukalt kustutatud.',
  'Võõrvõtme andmed on edukalt muudetud.',
  'Võõrvõri on edukalt loodud.',
  'Lähte- ja sihtveerud peavad eksisteerima ja omama sama andmetüüpi, sihtveergudel peab olema määratud indeks ning viidatud andmed peavad eksisteerima.',
  'Võõrvõti',
  'Siht-tabel',
  'Muuda',
  'Lisa veerg',
  'Vaade (VIEW) on edukalt muudetud.',
  'Vaade (VIEW) on edukalt kustutatud.',
  'Vaade (VIEW) on edukalt loodud.',
  'Loo uus vaade (VIEW)',
  'Sündmus on edukalt kustutatud.',
  'Sündmuse andmed on edukalt uuendatud.',
  'Sündmus on edukalt loodud.',
  'Muuda sündmuse andmeid',
  'Loo uus sündmus (EVENT)',
  'Alusta',
  'Lõpeta',
  'Iga',
  'Lõpetamisel jäta sündmus alles',
  'Protseduur on edukalt kustutatud.',
  'Protseduuri andmed on edukalt muudetud.',
  'Protseduur on edukalt loodud.',
  'Muuda funktsiooni',
  'Muuda protseduuri',
  'Loo uus funktsioon',
  'Loo uus protseduur',
  'Tagastustüüp',
  'Check has been dropped.',
  'Check has been altered.',
  'Check has been created.',
  'Alter check',
  'Päästik on edukalt kustutatud.',
  'Päästiku andmed on edukalt uuendatud.',
  'Uus päästik on edukalt loodud.',
  'Muuda päästiku andmeid',
  'Loo uus päästik (TRIGGER)',
  'Aeg',
  'Sündmus',
  'Kasutaja on edukalt kustutatud.',
  'Kasutaja andmed on edukalt muudetud.',
  'Kasutaja on edukalt lisatud.',
  'Häshitud (Hashed)',
  'Protseduur',
  'Anna',
  'Eemalda',
  [
    'Protsess on edukalt peatatud (%d).',
    'Valitud protsessid (%d) on edukalt peatatud.',
  ],
  'Kloon',
  'Kokku: %d',
  'Peata',
  'Mõjutatud kirjeid: %d.',
  'Väärtuse muutmiseks Ctrl+kliki sellel.',
  'File must be in UTF-8 encoding.',
  'Imporditi %d rida.',
  'Tabeli valimine ebaõnnestus',
  'Modify',
  'Seosed',
  'muuda',
  'Väärtuse muutmiseks kasuta muutmislinki.',
  'Load more data',
  'Loading',
  'Lehekülg',
  'viimane',
  'Täielikud tulemused',
  'Validud tabelid on edukalt tühjendatud.',
  'Valitud tabelid on edukalt liigutatud.',
  'Tabelid on edukalt kopeeritud.',
  'Valitud tabelid on edukalt kustutatud.',
  'Tables have been optimized.',
  'Struktuur',
  'Tabelid ja vaated',
  'Otsi kogu andmebaasist',
  'Implementatsioon',
  'Andmete pikkus',
  'Indeksi pikkus',
  'Vaba ruumi',
  'Ridu',
  'Vacuum',
  'Optimeeri',
  'Kontrolli',
  'Analüüsi',
  'Paranda',
  'Tühjenda',
  'Liiguta teise andmebaasi',
  'Liiguta',
  'Kopeeri',
  'overwrite',
  'Ajakava',
  'Antud ajahetkel',
  'HH:MM:SS',
];
		case "fa": return [
  '%.3f s',
  'قادر به بارگذاری فایل نیستید.',
  ' %sB حداکثر اندازه فایل.',
  'فایل وجود ندارد.',
  ' ',
  '۰۱۲۳۴۵۶۷۸۹',
  'انواع کاربر',
  'مطمئن هستید؟',
  'Increase %s.',
  'بارگذاری غیر فعال است.',
  'اصلی',
  'جدولی وجود ندارد.',
  'ویرایش',
  'درج',
  'سطری وجود ندارد.',
  'شما اختیار ویرایش این جدول را ندارید.',
  'ذخیره',
  'ذخیره و ادامه ویرایش',
  'ذخیره و درج بعدی',
  'Saving',
  'حذف',
  'زبان',
  'استفاده',
  'Unknown error.',
  'سیستم',
  'سرور',
  'hostname[:port] or :socket',
  'نام کاربری',
  'کلمه عبور',
  'پایگاه داده',
  'ورود',
  'ورود دائم',
  'Adminer does not support accessing a database without a password, <a href="https://www.adminer.org/en/password/"%s>more information</a>.',
  'انتخاب داده',
  'نمایش ساختار',
  'حذف نمایش',
  'ویرایش جدول',
  'آیتم جدید',
  'Warnings',
  [
    '%d بایت',
    '%d بایت',
  ],
  'ستون',
  'نوع',
  'توضیح',
  'افزایش خودکار',
  'مقدار پیش فرض',
  'انتخاب',
  'توابع',
  'تجمع',
  'جستجو',
  'هرکجا',
  'مرتب کردن',
  'نزولی',
  'محدودیت',
  'طول متن',
  'عملیات',
  'اسکن کامل جدول',
  'دستور SQL',
  'بازکردن',
  'ذخیره',
  'ویرایش پایگاه داده',
  'ویرایش ساختار',
  'ایجاد ساختار',
  'ساختار پایگاه داده',
  'امتیازات',
  'روالها',
  'صف ها',
  'رویدادها',
  'وارد کردن',
  'استخراج',
  'ایجاد جدول',
  'DB',
  'انتخاب',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  'Disable %s or enable %s or %s extensions.',
  'اعداد',
  'تاریخ و زمان',
  'رشته ها',
  'لیستها',
  'دودویی',
  'هندسه',
  'rtl',
  'شما آفلاین می باشید.',
  'خروج',
  [
    'ورودهای ناموفق بیش از حد، %d دقیقه دیگر تلاش نمایید.',
    'ورودهای ناموفق بیش از حد، %d دقیقه دیگر تلاش نمایید.',
  ],
  'با موفقیت خارج شدید.',
  'Thanks for using Adminer, consider <a href="https://www.adminer.org/en/donation/">donating</a>.',
  'نشست پایان یافته، لطفا دوباره وارد شوید.',
  'رمز اصلی باطل شده است. روش %s را <a href="https://www.adminer.org/en/extension/"%s>پیاده سازی</a> کرده تا آن را دائمی سازید.',
  'پشتیبانی از نشست بایستی فعال گردد.',
  'The action will be performed after successful login with the same credentials.',
  'پسوند نامعتبر',
  'هیچ کدام از افزونه های PHP پشتیبانی شده (%s) موجود نمی باشند.',
  'Connecting to privileged ports is not allowed.',
  'اعتبار سنجی نامعتبر.',
  'There is a space in the input password which might be the cause.',
  'CSRF token نامعتبر است. دوباره سعی کنید.',
  'حداکثر تعداد فیلدهای مجاز اشباع شد. لطفا %s را افزایش دهید.',
  'If you did not send this request from Adminer then close this page.',
  'حجم داده ارسالی برزگ است. حجم داده کاهش دهید و یا مقدار %s را در پیکربندی افزایش دهید.',
  'شما می توانید فایل SQL حجیم را از طریق FTP بارگزاری و از روی سرور وارد نمایید.',
  'کلیدهای خارجی',
  'تطبیق',
  'ON UPDATE',
  'ON DELETE',
  'نام ستون',
  'نام پارامتر',
  'طول',
  'اختیارات',
  'افرودن بعدی',
  'انتقال به بالا',
  'انتقال به پایین',
  'حذف',
  'پایگاه داده نامعتبر.',
  'پایگاه های داده حذف شدند.',
  'انتخاب پایگاه داده',
  'ایجاد پایگاه داده',
  'لیست فرآیند',
  'متغیرها',
  'وضعیت',
  'نسخه %s : %s توسعه پی اچ پی %s',
  'ورود به عنوان: %s',
  'بازیابی',
  'تطبیق',
  'جدولها',
  'حجم',
  'محاسبه',
  'انتخاب شده',
  'حذف',
  'Loaded plugins',
  'screenshot',
  'نمایه مادی',
  'نمایش',
  'جدول',
  'Inherits from',
  'ایندکسها',
  'ویرایش ایندکسها',
  'منبع',
  'هدف',
  'ویرایش',
  'افزودن کلید خارجی',
  'Checks',
  'Create check',
  'تریگرها',
  'افزودن تریگر',
  'Inherited by',
  'ارتباط دائم',
  'خروجی',
  'حذف',
  'داده',
  'ایجاد کاربر',
  'ATTACH queries are not supported.',
  'خطا در کوئری',
  '%d / ',
  [
    '%d سطر',
    '%d سطر',
  ],
  'کوئری اجرا شد. %d سطر تغیر کرد.',
  'دستوری برای اجرا وجود ندارد.',
  '%d کوئری اجرا شد.',
  'اجرا',
  'محدودیت سطرها',
  'بارگذاری فایل',
  'از سرور',
  '%s فایل وب سرور',
  'اجرای فایل',
  'توقف بر روی خطا',
  'فقط نمایش خطاها',
  'تاریخ',
  'پاک کردن',
  'ویرایش همه',
  'آیتم حذف شد.',
  'آیتم بروز رسانی شد.',
  '%s آیتم درج شد.',
  'جدول حذف شد.',
  'جدول ویرایش شد.',
  'جدول ایجاد شد.',
  'نام جدول',
  'موتور',
  'مقادیر پیش فرض',
  'Drop %s?',
  'بخشبندی توسط',
  'بخشبندیها',
  'نام بخش',
  'مقادیر',
  'ایندکسها ویرایش شدند.',
  'نوع ایندکس',
  'Algorithm',
  'Columns',
  'طول',
  'نام',
  'Condition',
  'پایگاه داده حذف شد.',
  'نام پایگاه داده تغیر کرد.',
  'پایگاه داده ایجاد شد.',
  'پایگاه داده ویرایش شد.',
  'صدا زدن',
  [
    'روال فراخوانی شد %d سطر متاثر شد.',
    'روال فراخوانی شد %d سطر متاثر شد.',
  ],
  'کلید خارجی حذف شد.',
  'کلید خارجی ویرایش شد.',
  'کلید خارجی ایجاد شد.',
  'داده مبدا و مقصد ستونها بایستی شبیه هم باشند.',
  'کلید خارجی',
  'جدول هدف',
  'تغییر',
  'افزودن ستون',
  'نمایش ویرایش شد.',
  'نمایش حذف شد.',
  'نمایش ایجاد شد.',
  'ایجاد نمایش',
  'رویداد حذف شد.',
  'رویداد ویرایش شد.',
  'رویداد ایجاد شد.',
  'ویرایش رویداد',
  'ایجاد رویداد',
  'آغاز',
  'پایان',
  'همه',
  'تکمیل حفاظت فعال است',
  'روال حذف شد.',
  'روال ویرایش شد.',
  'روال ایجاد شد.',
  'ویرایش تابع',
  'ویرایش زیربرنامه',
  'ایجاد تابع',
  'ایجاد زیربرنامه',
  'برگرداندن نوع',
  'Check has been dropped.',
  'Check has been altered.',
  'Check has been created.',
  'Alter check',
  'تریگر حذف شد.',
  'تریگر ویرایش شد.',
  'تریگر ایجاد شد.',
  'ویرایش تریگر',
  'ایجاد تریگر',
  'زمان',
  'رویداد',
  'کاربر حذف شد.',
  'کاربر ویرایش گردید.',
  'کاربر ایجاد شد.',
  'به هم ریخته',
  'روتین',
  'اعطا',
  'لغو کردن',
  '%d فرآیند متوقف شد.',
  'تکثیر',
  ' به طور کل %d ',
  'حذف فرآیند',
  [
    '%d آیتم متاثر شد.',
    '%d آیتم متاثر شد.',
  ],
  'برای ویرایش بر روی مقدار ctrl+click کنید.',
  'فرمت فایل باید UTF-8 باشید.',
  [
    '%d سطر وارد شد.',
    '%d سطر وارد شد.',
  ],
  'قادر به انتخاب جدول نیستید',
  'ویرایش',
  'رابطه ها',
  'ویرایش',
  'از لینک ویرایش برای ویرایش این مقدار استفاده کنید.',
  'بارگزاری اطلاعات بیشتر',
  'در حال بارگزاری',
  'صفحه',
  'آخری',
  'همه نتایج',
  'جدولها بریده شدند.',
  'جدولها انتقال داده شدند.',
  'جدولها کپی شدند.',
  'جدولها حذف شدند.',
  'جدولها بهینه شدند.',
  'ساختار',
  'جدولها و نمایه ها',
  'جستجوی داده در جدول',
  'موتور',
  'طول داده',
  'طول ایندکس',
  'داده اختیاری',
  'سطرها',
  'پاک سازی',
  'بهینه سازی',
  'بررسی',
  'تحلیل',
  'تعمیر',
  'کوتاه کردن',
  'انتقال به یک پایگاه داده دیگر',
  'انتقال',
  'کپی کردن',
  'overwrite',
  'زمانبندی',
  'زمان معین',
  'ویرایش نوع',
];
		case "fi": return [
  '%.3f s',
  'Tiedostoa ei voida ladata palvelimelle.',
  'Suurin sallittu tiedostokoko on %sB.',
  'Tiedostoa ei ole.',
  ',',
  '0123456789',
  'Käyttäjän tyypit',
  'Oletko varma?',
  'Increase %s.',
  'Tiedostojen lataaminen palvelimelle on estetty.',
  'alkuperäinen',
  'Ei tauluja.',
  'Muokkaa',
  'Lisää',
  'Ei rivejä.',
  'Sinulla ei ole oikeutta päivittää tätä taulua.',
  'Tallenna',
  'Tallenna ja jatka muokkaamista',
  'Tallenna ja lisää seuraava',
  'Tallennetaan',
  'Poista',
  'Kieli',
  'Käytä',
  'Tuntematon virhe.',
  'Järjestelmä',
  'Palvelin',
  'hostname[:port] or :socket',
  'Käyttäjänimi',
  'Salasana',
  'Tietokanta',
  'Kirjaudu',
  'Haluan pysyä kirjautuneena',
  'Adminer ei tue pääsyä tietokantaan ilman salasanaa, katso tarkemmin <a href="https://www.adminer.org/en/password/"%s>täältä</a>.',
  'Valitse data',
  'Näytä rakenne',
  'Muuta näkymää',
  'Muuta taulua',
  'Uusi tietue',
  'Varoitukset',
  [
    '%d tavu',
    '%d tavua',
  ],
  'Sarake',
  'Tyyppi',
  'Kommentit',
  'Automaattinen lisäys',
  'Oletusarvo',
  'Valitse',
  'Funktiot',
  'Aggregaatiot',
  'Hae',
  'kaikkialta',
  'Lajittele',
  'alenevasti',
  'Raja',
  'Tekstin pituus',
  'Toimenpide',
  'Koko taulun läpikäynti',
  'SQL-komento',
  'avaa',
  'tallenna',
  'Muuta tietokantaa',
  'Muuta kaavaa',
  'Luo kaava',
  'Tietokantakaava',
  'Oikeudet',
  'Rutiinit',
  'Sekvenssit',
  'Tapahtumat',
  'Tuonti',
  'Vienti',
  'Luo taulu',
  'TK',
  'valitse',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  'Poista käytöstä %s tai ota käyttöön laajennus %s tai %s.',
  'Numerot',
  'Päiväys ja aika',
  'Merkkijonot',
  'Luettelot',
  'Binäärinen',
  'Geometria',
  'ltr',
  'Olet offline-tilassa.',
  'Kirjaudu ulos',
  [
    'Liian monta epäonnistunutta sisäänkirjautumisyritystä, kokeile uudestaan %d minuutin kuluttua.',
    'Liian monta epäonnistunutta sisäänkirjautumisyritystä, kokeile uudestaan %d minuutin kuluttua.',
  ],
  'Uloskirjautuminen onnistui.',
  'Kiitos, kun käytät Admineriä, voit <a href="https://www.adminer.org/en/donation/">tehdä lahjoituksen tästä</a>.',
  'Istunto vanhentunut, kirjaudu uudelleen.',
  'Master-salasana ei ole enää voimassa. <a href="https://www.adminer.org/en/extension/"%s>Toteuta</a> %s-metodi sen tekemiseksi pysyväksi.',
  'Istuntotuki on oltava päällä.',
  'Toiminto suoritetaan sen jälkeen, kun on onnistuttu kirjautumaan samoilla käyttäjätunnuksilla uudestaan.',
  'Ei laajennusta',
  'Mitään tuetuista PHP-laajennuksista (%s) ei ole käytettävissä.',
  'Yhteydet etuoikeutettuihin portteihin eivät ole sallittuja.',
  'Virheelliset kirjautumistiedot.',
  'Syynä voi olla syötetyssä salasanassa oleva välilyönti.',
  'Virheellinen CSRF-vastamerkki. Lähetä lomake uudelleen.',
  'Kenttien sallittu enimmäismäärä ylitetty. Kasvata arvoa %s.',
  'Jollet lähettänyt tämä pyyntö Adminerista, sulje tämä sivu.',
  'Liian suuri POST-datamäärä. Pienennä dataa tai kasvata arvoa %s konfigurointitiedostossa.',
  'Voit ladata suuren SQL-tiedoston FTP:n kautta ja tuoda sen sitten palvelimelta.',
  'Vieraat avaimet',
  'kollaatio',
  'ON UPDATE',
  'ON DELETE',
  'Sarakkeen nimi',
  'Parametrin nimi',
  'Pituus',
  'Asetukset',
  'Lisää seuraava',
  'Siirrä ylös',
  'Siirrä alas',
  'Poista',
  'Tietokanta ei kelpaa.',
  'Tietokannat on poistettu.',
  'Valitse tietokanta',
  'Luo tietokanta',
  'Prosessilista',
  'Muuttujat',
  'Tila',
  '%s versio: %s PHP-laajennuksella %s',
  'Olet kirjautunut käyttäjänä: %s',
  'Virkistä',
  'Kollaatio',
  'Taulut',
  'Koko',
  'Laske',
  'Valitut',
  'Poista',
  'Loaded plugins',
  'screenshot',
  'Materialisoitunut näkymä',
  'Näkymä',
  'Taulu',
  'Inherits from',
  'Indeksit',
  'Muuta indeksejä',
  'Lähde',
  'Kohde',
  'Muuta',
  'Lisää vieras avain',
  'Checks',
  'Create check',
  'Liipaisimet',
  'Lisää liipaisin',
  'Inherited by',
  'Pysyvä linkki',
  'Tulos',
  'Muoto',
  'Data',
  'Luo käyttäjä',
  'ATTACH-komennolla tehtyjä kyselyjä ei tueta.',
  'Virhe kyselyssä',
  '%d / ',
  [
    '%d rivi',
    '%d riviä',
  ],
  [
    'Kysely onnistui, kohdistui %d riviin.',
    'Kysely onnistui, kohdistui %d riviin.',
  ],
  'Ei komentoja suoritettavana.',
  [
    '%d kysely onnistui.',
    '%d kyselyä onnistui.',
  ],
  'Suorita',
  'Rajoita rivimäärää',
  'Tiedoston lataus palvelimelle',
  'Verkkopalvelimella Adminer-kansiossa oleva tiedosto',
  'Verkkopalvelintiedosto %s',
  'Suorita tämä',
  'Pysähdy virheeseen',
  'Näytä vain virheet',
  'Historia',
  'Tyhjennä',
  'Muokkaa kaikkia',
  'Tietue poistettiin.',
  'Tietue päivitettiin.',
  'Tietue%s lisättiin.',
  'Taulu on poistettu.',
  'Taulua on muutettu.',
  'Taulu on luotu.',
  'Taulun nimi',
  'moottori',
  'Oletusarvot',
  'Poistetaanko %s?',
  'Osioi arvolla',
  'Osiot',
  'Osion nimi',
  'Arvot',
  'Indeksejä on muutettu.',
  'Indeksityyppi',
  'Algorithm',
  'Columns',
  'pituus',
  'Nimi',
  'Condition',
  'Tietokanta on poistettu.',
  'Tietokanta on nimetty uudelleen.',
  'Tietokanta on luotu.',
  'Tietokantaa on muutettu.',
  'Kutsua',
  [
    'Rutiini kutsuttu, kohdistui %d riviin.',
    'Rutiini kutsuttu, kohdistui %d riviin.',
  ],
  'Vieras avain on poistettu.',
  'Vierasta avainta on muutettu.',
  'Vieras avain on luotu.',
  'Lähde- ja kohdesarakkeiden tulee olla samaa tietotyyppiä, kohdesarakkeisiin tulee olla indeksi ja dataa, johon viitataan, täytyy olla.',
  'Vieras avain',
  'Kohdetaulu',
  'Muuta',
  'Lisää sarake',
  'Näkymää on muutettu.',
  'Näkymä on poistettu.',
  'Näkymä on luotu.',
  'Luo näkymä',
  'Tapahtuma on poistettu.',
  'Tapahtumaa on muutettu.',
  'Tapahtuma on luotu.',
  'Muuta tapahtumaa',
  'Luo tapahtuma',
  'Aloitus',
  'Lopetus',
  'Joka',
  'Säilytä, kun valmis',
  'Rutiini on poistettu.',
  'Rutiinia on muutettu.',
  'Rutiini on luotu.',
  'Muuta funktiota',
  'Muuta proseduuria',
  'Luo funktio',
  'Luo proseduuri',
  'Palautustyyppi',
  'Check has been dropped.',
  'Check has been altered.',
  'Check has been created.',
  'Alter check',
  'Liipaisin on poistettu.',
  'Liipaisinta on muutettu.',
  'Liipaisin on luotu.',
  'Muuta liipaisinta',
  'Luo liipaisin',
  'Aika',
  'Tapahtuma',
  'Käyttäjä poistettiin.',
  'Käyttäjää muutettiin.',
  'Käyttäjä luotiin.',
  'Hashed',
  'Rutiini',
  'Myönnä',
  'Kiellä',
  [
    '%d prosessi lopetettu.',
    '%d prosessia lopetettu..',
  ],
  'Kloonaa',
  '%d kaikkiaan',
  'Lopeta',
  [
    'Kohdistui %d tietueeseen.',
    'Kohdistui %d tietueeseen.',
  ],
  'Ctrl+napsauta arvoa muuttaaksesi.',
  'Tiedoston täytyy olla UTF-8-muodossa.',
  [
    '%d rivi tuotiin.',
    '%d riviä tuotiin.',
  ],
  'Taulua ei voitu valita',
  'Muuta',
  'Suhteet',
  'muokkaa',
  'Käytä muokkaa-linkkiä muuttaaksesi tätä arvoa.',
  'Lataa lisää dataa',
  'Ladataan',
  'Sivu',
  'viimeinen',
  'Koko tulos',
  'Taulujen sisältö on tyhjennetty.',
  'Taulut on siirretty.',
  'Taulut on kopioitu.',
  'Tauluja on poistettu.',
  'Taulut on optimoitu.',
  'Kaava',
  'Taulut ja näkymät',
  'Hae dataa tauluista',
  'Moottori',
  'Datan pituus',
  'Indeksin pituus',
  'Vapaa tila',
  'Riviä',
  'Siivoa',
  'Optimoi',
  'Tarkista',
  'Analysoi',
  'Korjaa',
  'Tyhjennä',
  'Siirrä toiseen tietokantaan',
  'Siirrä',
  'Kopioi',
  'kirjoittaen päälle',
  'Aikataulu',
  'Tiettynä aikana',
  'Tietokanta ei tue salasanaa.',
];
		case "fr": return [
  '%.3f s',
  'Impossible d\'importer le fichier.',
  'La taille maximale des fichiers est de %sB.',
  'Le fichier est introuvable.',
  ',',
  '0123456789',
  'Types utilisateur',
  'Êtes-vous certain(e) ?',
  'Increase %s.',
  'L\'importation de fichier est désactivée.',
  'original',
  'Aucune table.',
  'Modifier',
  'Insérer',
  'Aucun résultat.',
  'Vous n\'avez pas les droits pour mettre à jour cette table.',
  'Enregistrer',
  'Enr. et continuer édition',
  'Enr. et insérer prochain',
  'Enregistrement',
  'Effacer',
  'Langue',
  'Utiliser',
  'Erreur inconnue.',
  'Système',
  'Serveur',
  'hostname[:port] or :socket',
  'Utilisateur',
  'Mot de passe',
  'Base de données',
  'Authentification',
  'Authentification permanente',
  'Adminer ne supporte pas l\'accès aux bases de données sans mot de passe, <a href="https://www.adminer.org/en/password/"%s>plus d\'information</a>.',
  'Afficher les données',
  'Afficher la structure',
  'Modifier une vue',
  'Modifier la table',
  'Nouvel élément',
  'Avertissements',
  [
    '%d octet',
    '%d octets',
  ],
  'Colonne',
  'Type',
  'Commentaire',
  'Incrément automatique',
  'Valeur par défaut',
  'Sélectionner',
  'Fonctions',
  'Agrégation',
  'Rechercher',
  'n\'importe où',
  'Trier',
  'décroissant',
  'Limite',
  'Longueur du texte',
  'Action',
  'Scan de toute la table',
  'Requête SQL',
  'ouvrir',
  'enregistrer',
  'Modifier la base de données',
  'Modifier le schéma',
  'Créer un schéma',
  'Schéma de la base de données',
  'Privilèges',
  'Routines',
  'Séquences',
  'Évènements',
  'Importer',
  'Exporter',
  'Créer une table',
  'BD',
  'select',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  'Désactiver %s ou activer %s or %s extensions.',
  'Nombres',
  'Date et heure',
  'Chaînes',
  'Listes',
  'Binaires',
  'Géométrie',
  'ltr',
  'Vous êtes hors ligne.',
  'Déconnexion',
  [
    'Trop de connexions échouées, essayez à nouveau dans %d minute.',
    'Trop de connexions échouées, essayez à nouveau dans %d minutes.',
  ],
  'Au revoir !',
  'Thanks for using Adminer, consider <a href="https://www.adminer.org/en/donation/">donating</a>.',
  'Session expirée, veuillez vous authentifier à nouveau.',
  'Le mot de passe a expiré. <a href="https://www.adminer.org/en/extension/"%s>Implémentez</a> la méthode %s afin de le rendre permanent.',
  'Veuillez activer les sessions.',
  'Cette action sera exécutée après s\'être connecté avec les mêmes données de connexion.',
  'Extension introuvable',
  'Aucune des extensions PHP supportées (%s) n\'est disponible.',
  'La connexion aux ports privilégiés n\'est pas autorisée.',
  'Authentification échouée.',
  'Il y a un espace dans le mot de passe entré qui pourrait en être la cause.',
  'Token CSRF invalide. Veuillez renvoyer le formulaire.',
  'Le nombre maximum de champs est dépassé. Veuillez augmenter %s.',
  'Si vous n\'avez pas envoyé cette requête depuis Adminer, alors fermez cette page.',
  'Données POST trop grandes. Réduisez la taille des données ou augmentez la valeur de %s dans la configuration de PHP.',
  'Vous pouvez uploader un gros fichier SQL par FTP et ensuite l\'importer depuis le serveur.',
  'Clés étrangères',
  'interclassement',
  'ON UPDATE',
  'ON DELETE',
  'Nom de la colonne',
  'Nom du paramètre',
  'Longueur',
  'Options',
  'Ajouter le prochain',
  'Déplacer vers le haut',
  'Déplacer vers le bas',
  'Effacer',
  'Base de données invalide.',
  'Les bases de données ont été supprimées.',
  'Sélectionner la base de données',
  'Créer une base de données',
  'Liste des processus',
  'Variables',
  'Statut',
  'Version de %s : %s via l\'extension PHP %s',
  'Authentifié en tant que : %s',
  'Rafraîchir',
  'Interclassement',
  'Tables',
  'Taille',
  'Calcul',
  'Sélectionnée(s)',
  'Supprimer',
  'Loaded plugins',
  'screenshot',
  'Vue matérialisée',
  'Vue',
  'Table',
  'Inherits from',
  'Index',
  'Modifier les index',
  'Source',
  'Cible',
  'Modifier',
  'Ajouter une clé étrangère',
  'Checks',
  'Create check',
  'Déclencheurs',
  'Ajouter un déclencheur',
  'Inherited by',
  'Lien permanent',
  'Sortie',
  'Format',
  'Données',
  'Créer un utilisateur',
  'Requêtes ATTACH ne sont pas supportées.',
  'Erreur dans la requête',
  '%d / ',
  [
    '%d ligne',
    '%d lignes',
  ],
  [
    'Requête exécutée avec succès, %d ligne modifiée.',
    'Requête exécutée avec succès, %d lignes modifiées.',
  ],
  'Aucune commande à exécuter.',
  [
    '%d requête exécutée avec succès.',
    '%d requêtes exécutées avec succès.',
  ],
  'Exécuter',
  'Limiter les lignes',
  'Importer un fichier',
  'Depuis le serveur',
  'Fichier %s du serveur Web',
  'Exécuter le fichier',
  'Arrêter en cas d\'erreur',
  'Montrer seulement les erreurs',
  'Historique',
  'Effacer',
  'Tout modifier',
  'L\'élément a été supprimé.',
  'L\'élément a été modifié.',
  'L\'élément%s a été inséré.',
  'La table a été effacée.',
  'La table a été modifiée.',
  'La table a été créée.',
  'Nom de la table',
  'moteur',
  'Valeurs par défaut',
  'Supprimer %s?',
  'Partitionner par',
  'Partitions',
  'Nom de la partition',
  'Valeurs',
  'Index modifiés.',
  'Type d\'index',
  'Algorithm',
  'Columns',
  'longueur',
  'Nom',
  'Condition',
  'La base de données a été supprimée.',
  'La base de données a été renommée.',
  'La base de données a été créée.',
  'La base de données a été modifiée.',
  'Appeler',
  [
    'La routine a été exécutée, %d ligne modifiée.',
    'La routine a été exécutée, %d lignes modifiées.',
  ],
  'La clé étrangère a été effacée.',
  'La clé étrangère a été modifiée.',
  'La clé étrangère a été créée.',
  'Les colonnes de source et de destination doivent être du même type, il doit y avoir un index sur les colonnes de destination et les données référencées doivent exister.',
  'Clé étrangère',
  'Table visée',
  'Modifier',
  'Ajouter une colonne',
  'La vue a été modifiée.',
  'La vue a été effacée.',
  'La vue a été créée.',
  'Créer une vue',
  'L\'évènement a été supprimé.',
  'L\'évènement a été modifié.',
  'L\'évènement a été créé.',
  'Modifier un évènement',
  'Créer un évènement',
  'Démarrer',
  'Terminer',
  'Chaque',
  'Conserver quand complété',
  'La routine a été supprimée.',
  'La routine a été modifiée.',
  'La routine a été créée.',
  'Modifier la fonction',
  'Modifier la procédure',
  'Créer une fonction',
  'Créer une procédure',
  'Type de retour',
  'Check has been dropped.',
  'Check has been altered.',
  'Check has been created.',
  'Alter check',
  'Le déclencheur a été supprimé.',
  'Le déclencheur a été modifié.',
  'Le déclencheur a été créé.',
  'Modifier un déclencheur',
  'Ajouter un déclencheur',
  'Temps',
  'Évènement',
  'L\'utilisateur a été effacé.',
  'L\'utilisateur a été modifié.',
  'L\'utilisateur a été créé.',
  'Haché',
  'Routine',
  'Grant',
  'Revoke',
  [
    '%d processus a été arrêté.',
    '%d processus ont été arrêtés.',
  ],
  'Cloner',
  '%d au total',
  'Arrêter',
  [
    '%d élément a été modifié.',
    '%d éléments ont été modifiés.',
  ],
  'Ctrl+cliquez sur une valeur pour la modifier.',
  'Les fichiers doivent être encodés en UTF-8.',
  [
    '%d ligne a été importée.',
    '%d lignes ont été importées.',
  ],
  'Impossible de sélectionner la table',
  'Modification',
  'Relations',
  'modifier',
  'Utilisez le lien \'modifier\' pour modifier cette valeur.',
  'Charger plus de données',
  'Chargement',
  'Page',
  'dernière',
  'Résultat entier',
  'Les tables ont été tronquées.',
  'Les tables ont été déplacées.',
  'Les tables ont été copiées.',
  'Les tables ont été effacées.',
  'Les tables ont bien été optimisées.',
  'Schéma',
  'Tables et vues',
  'Rechercher dans les tables',
  'Moteur',
  'Longueur des données',
  'Longueur de l\'index',
  'Espace inutilisé',
  'Lignes',
  'Vide',
  'Optimiser',
  'Vérifier',
  'Analyser',
  'Réparer',
  'Tronquer',
  'Déplacer vers une autre base de données',
  'Déplacer',
  'Copier',
  'écraser',
  'Horaire',
  'À un moment précis',
  'La base de données ne support pas les mots de passe.',
];
		case "gl": return [
  '%.3f s',
  'Non é posible importar o ficheiro.',
  'O tamaño máximo de ficheiro permitido é de %sB.',
  'O ficheiro non existe.',
  ' ',
  '0123456789',
  'Tipos definidos polo usuario',
  'Está seguro?',
  'Increase %s.',
  'Importación de ficheiros deshablilitada.',
  'orixinal',
  'Nengunha táboa.',
  'Editar',
  'Inserir',
  'Nengún resultado.',
  'Non tes privilexios para actualizar esta táboa.',
  'Gardar',
  'Gardar se seguir editando',
  'Guardar e inserir seguinte',
  'Gardando',
  'Borrar',
  'Lingua',
  'Usar',
  'Unknown error.',
  'Sistema',
  'Servidor',
  'hostname[:port] or :socket',
  'Usuario',
  'Contrasinal',
  'Base de datos',
  'Conectar',
  'Permanecer conectado',
  'Adminer does not support accessing a database without a password, <a href="https://www.adminer.org/en/password/"%s>more information</a>.',
  'Seleccionar datos',
  'Amosar estructura',
  'Modificar vista',
  'Modificar táboa',
  'Novo elemento',
  'Warnings',
  [
    '%d byte',
    '%d bytes',
  ],
  'Columna',
  'Tipo',
  'Comentario',
  'Incremento automático',
  'Valor por defecto',
  'Seleccionar',
  'Funcións',
  'Agregados',
  'Buscar',
  'onde sexa',
  'Ordenar',
  'descendente',
  'Límite',
  'Lonxitud do texto',
  'Acción',
  'Escaneo completo da táboa',
  'Comando SQL',
  'abrir',
  'gardar',
  'Modificar Base de datos',
  'Modificar esquema',
  'Crear esquema',
  'Esquema de base de datos',
  'Privilexios',
  'Rutinas',
  'Secuencias',
  'Eventos',
  'Importar',
  'Exportar',
  'Crear táboa',
  'DB',
  'selecciona',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  'Disable %s or enable %s or %s extensions.',
  'Números',
  'Data e hora',
  'Cadea',
  'Listas',
  'Binario',
  'Xeometría',
  'ltr',
  'Non tes conexión.',
  'Pechar sesión',
  [
    'Demasiados intentos de conexión, intentao de novo en %d minuto.',
    'Demasiados intentos de conexión, intentao de novo en %d minutos.',
  ],
  'Pechouse a sesión con éxito.',
  'Thanks for using Adminer, consider <a href="https://www.adminer.org/en/donation/">donating</a>.',
  'Caducou a sesión, por favor acceda de novo.',
  'O contrasinal principal caducou. <a href="https://www.adminer.org/en/extension/"%s>Implementa</a> o método %s para facelo permanente.',
  'As sesións deben estar habilitadas.',
  'The action will be performed after successful login with the same credentials.',
  'Non ten extensión',
  'Ningunha das extensións PHP soportadas (%s) está dispoñible.',
  'Connecting to privileged ports is not allowed.',
  'Credenciais (usuario e/ou contrasinal) inválidos.',
  'There is a space in the input password which might be the cause.',
  'Token CSRF inválido. Envíe de novo os datos do formulario.',
  'Excedida o número máximo de campos permitidos. Por favor aumente %s.',
  'Se non enviaches esta petición dende o Adminer entón pecha esta páxina.',
  'Datos POST demasiado grandes. Reduza os datos ou aumente a directiva de configuración %s.',
  'Podes subir un ficheiro SQL de gran tamaño vía FTP e importalo dende o servidor.',
  'Chaves externas',
  'xogo de caracteres (collation)',
  'AO ACTUALIZAR (ON UPDATE)',
  'AO BORRAR (ON DELETE)',
  'Nome da columna',
  'Nome de Parámetro',
  'Lonxitude',
  'Opcións',
  'Engadir seguinte',
  'Mover arriba',
  'Mover abaixo',
  'Eliminar',
  'Base de datos incorrecta.',
  'Elimináronse as bases de datos.',
  'Seleccionar Base de datos',
  'Crear Base de datos',
  'Lista de procesos',
  'Variables',
  'Estado',
  'Versión %s: %s a través da extensión de PHP %s',
  'Conectado como: %s',
  'Refrescar',
  'Xogo de caracteres (collation)',
  'Táboas',
  'Tamaño',
  'Calcular',
  'Selección',
  'Eliminar',
  'Loaded plugins',
  'screenshot',
  'Vista materializada',
  'Vista',
  'Táboa',
  'Inherits from',
  'Índices',
  'Modificar índices',
  'Orixe',
  'Destino',
  'Modificar',
  'Engadir chave externa',
  'Checks',
  'Create check',
  'Disparadores',
  'Engadir disparador',
  'Inherited by',
  'Ligazón permanente',
  'Salida',
  'Formato',
  'Datos',
  'Crear Usuario',
  'ATTACH queries are not supported.',
  'Erro na consulta',
  [
    '%d / ',
    '%d / ',
  ],
  [
    '%d fila',
    '%d filas',
  ],
  [
    'Consulta executada, %d fila afectada.',
    'Consulta executada, %d filas afectadas.',
  ],
  'Non hai comandos para executar.',
  [
    '%d consulta executada correctamente.',
    '%d consultas executadas correctamente.',
  ],
  'Executar',
  'Limitar filas',
  'Importar ficheiro',
  'Desde o servidor',
  'Ficheiro de servidor web %s',
  'Executar ficheiro',
  'Parar en caso de erro',
  'Amosar só erros',
  'Histórico',
  'Baleirar',
  'Editar todo',
  'Eliminouse o elemento.',
  'Modificouse o elemento.',
  'Inseríuse o elemento%s.',
  'Eliminouse a táboa.',
  'Modificouse a táboa.',
  'Creouse a táboa.',
  'Nome da táboa',
  'motor',
  'Valores predeterminados',
  'Drop %s?',
  'Particionar por',
  'Particións',
  'Nome da Partición',
  'Valores',
  'Alteráronse os índices.',
  'Tipo de índice',
  'Algorithm',
  'Columns',
  'lonxitude',
  'Nome',
  'Condition',
  'Eliminouse a base de datos.',
  'Renomeouse a base de datos.',
  'Creouse a base de datos.',
  'Modificouse a base de datos.',
  'Chamar',
  [
    'Chamouse á rutina, %d fila afectada.',
    'Chamouse á rutina, %d filas afectadas.',
  ],
  'Eliminouse a chave externa.',
  'Modificouse a chave externa.',
  'Creouse a chave externa.',
  'As columnas de orixe e destino deben ser do mesmo tipo, debe existir un índice nas columnas de destino e os datos referenciados deben existir.',
  'Chave externa',
  'táboa de destino',
  'Cambiar',
  'Engadir columna',
  'Modificouse a vista.',
  'Eliminouse a vista.',
  'Creouse a vista.',
  'Crear vista',
  'Eliminouse o evento.',
  'Modificouse o evento.',
  'Creouse o evento.',
  'Modificar Evento',
  'Crear Evento',
  'Inicio',
  'Fin',
  'Cada',
  'Ao completar manter',
  'Eliminouse o procedemento.',
  'Alterouse o procedemento.',
  'Creouse o procedemento.',
  'Modificar Función',
  'Modificar procedemento',
  'Crear función',
  'Crear procedemento',
  'Tipo de valor devolto',
  'Check has been dropped.',
  'Check has been altered.',
  'Check has been created.',
  'Alter check',
  'Eliminouse o disparador.',
  'Modificouse o disparador.',
  'Creouse o disparador.',
  'Modificar Disparador',
  'Crear Disparador',
  'Tempo',
  'Evento',
  'Eliminouse o usuario.',
  'Modificouse o usuario.',
  'Creouse o usuario.',
  'Hashed',
  'Rutina',
  'Conceder',
  'Revocar',
  [
    '%d proceso foi detido.',
    '%d procesos foron detidos.',
  ],
  'Clonar',
  '%d en total',
  'Deter',
  [
    '%d elemento afectado.',
    '%d elementos afectados.',
  ],
  'Ctrl+clic sobre o valor para editalo.',
  'O ficheiro ten que estar codificado con UTF-8.',
  [
    '%d fila importada.',
    '%d filas importadas.',
  ],
  'No é posible seleccionar a táboa',
  'Modificar',
  'Relacins',
  'editar',
  'Use a ligazón de edición para modificar este valor.',
  'Cargar máis datos',
  'Cargando',
  'Páxina',
  'último',
  'Resultado completo',
  'Baleiráronse as táboas.',
  'Movéronse as táboas.',
  'Copiáronse as táboas.',
  'Elimináronse as táboas.',
  'Optimizáronse as táboas.',
  'Esquema',
  'táboas e vistas',
  'Buscar datos en táboas',
  'Motor',
  'Lonxitude de datos',
  'Lonxitude de índice',
  'Espazo dispoñible',
  'Filas',
  'Baleirar',
  'Optimizar',
  'Comprobar',
  'Analizar',
  'Reparar',
  'Baleirar',
  'Mover a outra base de datos',
  'Mover',
  'Copiar',
  'overwrite',
  'Axenda',
  'No tempo indicado',
  'non',
];
		case "he": return [
  '%.3f s',
  'העלאת הקובץ נכשלה',
  'גודל מקסימלאי להעלאה: %sB',
  'הקובץ אינו קיים',
  ',',
  '0123456789',
  'סוגי משתמשים',
  'האם אתה בטוח?',
  'Increase %s.',
  'העלאת קבצים מבוטלת',
  'מקורי',
  'אין טבלאות',
  'ערוך',
  'הכנס',
  'אין שורות',
  'אין לך ההרשאות המתאימות לעדכן טבלה זו',
  'שמור',
  'שמור והמשך לערוך',
  'שמור והמשך להכניס',
  'שומר',
  'מחק',
  'שפה',
  'השתמש',
  'Unknown error.',
  'מערכת',
  'שרת',
  'hostname[:port] or :socket',
  'שם משתמש',
  'סיסמה',
  'מסד נתונים',
  'התחברות',
  'התחבר לצמיתות',
  'Adminer does not support accessing a database without a password, <a href="https://www.adminer.org/en/password/"%s>more information</a>.',
  'בחר נתונים',
  'הראה מבנה',
  'שנה תצוגה',
  'שנה טבלה',
  'פריט חדש',
  'Warnings',
  '%d בתים',
  'עמודה',
  'סוג',
  'הערה',
  'הגדלה אוטומטית',
  'ערך ברירת מחדל',
  'בחר',
  'פונקציות',
  'צבירה',
  'חפש',
  'בכל מקום',
  'מיין',
  'סדר הפוך',
  'הגבל',
  'אורך הטקסט',
  'פעולות',
  'סריקה טבלה מלאה',
  'שאילתת SQL',
  'פתח',
  'שמור',
  'שנה מסד נתונים',
  'שנה סכמה',
  'צור סכמה',
  'סכמת מסד נתונים',
  'פריווילגיות',
  'רוטינות',
  'סדרות',
  'אירועים',
  'יבא',
  'יצא',
  'צור טבלה',
  'DB',
  'בחר',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  'Disable %s or enable %s or %s extensions.',
  'מספרים',
  'תאריך ושעה',
  'מחרוזות',
  'רשימות',
  'בינארי',
  'גיאומטריה',
  'rtl',
  'הינך לא מקוון',
  'התנתק',
  'יותר מידי נסיונות כניסה נכשלו, אנא נסה עוד %d דקות',
  'ההתחברות הצליחה',
  'תודה שהשתמש ב-adminer אנא שקול <a href="https://www.adminer.org/en/donation/">לתרום</a>',
  'תם זמן ההפעלה, אנא התחבר שוב',
  'סיסמת המאסטר פגה <a href="https://www.adminer.org/en/extension/"%s>התקן תוסף</a> על מנת להפוך את זה לתמידי',
  'חובה להפעיל תמיכה בסשן',
  'The action will be performed after successful login with the same credentials.',
  'אין תוסף',
  'שום תוסף PHP (%s) זמין',
  'Connecting to privileged ports is not allowed.',
  'פרטי התחברות שגויים',
  'There is a space in the input password which might be the cause.',
  'כשל באבטחת נתונים, שלח טופס שוב',
  'הגעת למספר השדות המרבי. בבקשה הגדל את %s',
  'אם לא אתה שלחת בקשה ל-Adminer הינך יכול לסגור חלון זה',
  'מידע גדול מידי נשלח ב-POST. הקטן את את המידע הוא הגדלת את הגדרות ה-%s',
  'ניתן לעלות קבצים ב-FTP ואז למשוך אותם מהשרת',
  'מפתחות זרים',
  'קולקציה',
  'בעת עידכון',
  'בעת מחיקה',
  'שם עמודה',
  'שם הפרמטר',
  'אורך',
  'אפשרויות',
  'הוסף הבא',
  'הזז למעלה',
  'הזז למטה',
  'הסר',
  'מסד נתונים שגוי',
  'מסד הנתונים הושלך',
  'בחר מסד נתונים',
  'צור מסד נתונים',
  'רשימת תהליכים',
  'משתנים',
  'סטטוס',
  '%s גרסה: %s דרך תוסף PHP %s',
  'מחובר כ: %s',
  'רענן',
  'קולקציה',
  'טבלאות',
  'גודל',
  'חישוב',
  'נבחרים',
  'השלך',
  'Loaded plugins',
  'screenshot',
  'תצוגת מימוש ',
  'הצג',
  'טבלה',
  'Inherits from',
  'אינדקסים',
  'שנה אינדקסים',
  'מקור',
  'יעד',
  'שנה',
  'הוסף מפתח זר',
  'Checks',
  'Create check',
  'מפעילים',
  'הוסף טריגר',
  'Inherited by',
  'קישור סופי',
  'פלט',
  'פורמט',
  'נתונים',
  'צור משתמש',
  'שאילתת ATTACH אינה נתמכת',
  'שגיאה בשאילתה',
  '%d / ',
  '%d שורות',
  'השאילתה בוצעה כהלכה, %d שורות הושפעו',
  'לא נמצאו פקודות להרצה',
  '%d שאילתות בוצעו בהצלחה',
  'הרץ',
  'הגבל שורות',
  'העלה קובץ',
  'משרת',
  'קובץ השרת %s',
  'הרץ קובץ',
  'עצור בעת שגיאה',
  'הראה שגיאות בלבד',
  'היסטוריה',
  'נקה',
  'ערוך הכל',
  'הפריט נמחק',
  'הפריט עודכן',
  'הפריט %s הוזן בהצלחה',
  'הטבלה הושלכה',
  'הטבלה שונתה',
  'הטבלה נוצרה',
  'שם הטבלה',
  'מנוע',
  'ערכי ברירת מחדל',
  'Drop %s?',
  'מחיצות ע"י',
  'מחיצות',
  'שם מחיצה',
  'ערכים',
  'האינדקסים שונו',
  'סוג אינדקס',
  'Algorithm',
  'Columns',
  'אורך',
  'שם',
  'Condition',
  'מסד הנתונים הושלך',
  'שם מסד הנתונים שונה',
  'מסד הנתונים נוצר',
  'מסד הנתונים שונה',
  'קרא',
  'הרוטינה נקראה, %d שורות הושפעו',
  'המפתח הזר הושלך',
  'המפתח הזר שונה',
  'המפתח הזר נוצר',
  'על עמודות המקור והיעד להיות מאותו טיפוס נתונים, חובה שיהיה אינדקס בעמודת היעד ושהמידע המתאים יהיה קיים',
  'מפתח זר',
  'טבלת יעד',
  'שנה',
  'הוסף עמודה',
  'התצוגה שונתה',
  'התצוגה הושלכה',
  'התצוגה נוצרה',
  'צור תצוגה',
  'האירוע הושלך',
  'האירוע שונה',
  'האירוע נוצר',
  'שנה אירוע',
  'צור אירוע',
  'התחלה',
  'סיום',
  'כל',
  'בעת סיום שמור',
  'הרוטינה הושלכה',
  'הרוטינה שונתה',
  'הרוטינה נוצרה',
  'שנה פונקציה',
  'שנה פרוצדורה',
  'צור פונקציה',
  'צור פרוצדורה',
  'סוג ערך מוחזר',
  'Check has been dropped.',
  'Check has been altered.',
  'Check has been created.',
  'Alter check',
  'הטריגר הושלך',
  'הטריגר שונה',
  'הטריגר נוצר',
  'שנה טריגר',
  'צור טריגר',
  'זמן',
  'אירוע',
  'המשתמש הושלך',
  'המשתמש שונה',
  'המשתמש נוצר',
  'הצפנה',
  'רוטינה',
  'הענק',
  'שלול',
  '%d תהליכים חוסלו',
  'שכפל',
  '%d בסך הכל',
  'חסל',
  '%d פריטים הושפעו',
  'לחץ ctrl + לחיצת עכבר לערוך ערך זה',
  'על הקובץ להיות בקידוד utf-8',
  '%d שורות יובאו',
  'בחירת הטבלה נכשלה',
  'ערוך',
  'הקשרים',
  'ערוך',
  'השתמש בקישור העריכה בשביל לשנות את הערך',
  'טען נתונים נוספים',
  'טוען',
  'עמוד',
  'אחרון',
  'כל התוצאות',
  'הטבלה קוצרה',
  'הטבלה הועברה',
  'הטבלה הועתקה',
  'הטבלה הושלכה',
  'הטבלאות עברו אופטימיזציה',
  'סכמה',
  'טבלאות ותצוגות',
  'חפש מידע בטבלאות',
  'מנוע',
  'אורך נתונים',
  'אורך אינדקס',
  'נתונים משוחררים',
  'שורות',
  'וואקום',
  'יעל',
  'בדוק',
  'נתח',
  'תקן',
  'קצר',
  'העבר למסד נתונים אחר',
  'העבר',
  'העתק',
  'overwrite',
  'תזמן',
  'לפי זמן נתון',
  'לא',
];
		case "hi": return [
  '%.3f सेकंड',
  'फाइल अपलोड करने में असमर्थ।',
  'अधिकतम अनुमत फाइल आकार %sB है।',
  'फाइल मौजूद नहीं है।',
  ',',
  '०१२३४५६७८९',
  'उपयोगकर्ता प्रकार',
  'क्या आप सुनिश्चित हैं?',
  'Increase %s.',
  'फाइल अपलोड अक्षम हैं।',
  'मूल',
  'कोई टेबल नहीं।',
  'संपादित करें',
  'डालें',
  'कोई पंक्ति नहीं।',
  'आपके पास इस टेबल को अपडेट करने की अनुमति नहीं है।',
  'सहेजें',
  'सहेजें और संपादन जारी रखें',
  'सहेजें और अगला डालें',
  'सेव हो रहा है',
  'हटाएं',
  'भाषा',
  'उपयोग करें',
  'अज्ञात त्रुटि।',
  'सिस्टम',
  'सर्वर',
  'hostname[:port] or :socket',
  'उपयोगकर्ता नाम',
  'पासवर्ड',
  'डेटाबेस',
  'लॉगिन',
  'स्थायी लॉगिन',
  'एडमिनर बिना पासवर्ड के डेटाबेस एक्सेस करने का समर्थन नहीं करता, <a href="https://www.adminer.org/en/password/"%s>अधिक जानकारी</a>।',
  'डेटा चुनें',
  'संरचना दिखाएं',
  'व्यू बदलें',
  'टेबल बदलें',
  'नया आइटम',
  'चेतावनियाँ',
  [
    '%d बाइट',
    '%d बाइट्स',
  ],
  'कॉलम',
  'प्रकार',
  'टिप्पणी',
  'ऑटो इंक्रीमेंट',
  'डिफ़ॉल्ट मान',
  'चुनें',
  'फंक्शन्स',
  'एग्रीगेशन',
  'खोजें',
  'कहीं भी',
  'क्रमबद्ध करें',
  'अवरोही',
  'सीमा',
  'टेक्स्ट लंबाई',
  'कार्रवाई',
  'पूरी टेबल स्कैन',
  'SQL कमांड',
  'खोलें',
  'सहेजें',
  'डेटाबेस बदलें',
  'स्कीमा बदलें',
  'स्कीमा बनाएं',
  'डेटाबेस स्कीमा',
  'विशेषाधिकार',
  'रूटीन्स',
  'अनुक्रम',
  'घटनाएं',
  'आयात',
  'निर्यात',
  'टेबल बनाएं',
  'डेटाबेस',
  'चुनें',
  '%s को <a%s>एक ऐरे रिटर्न</a> करना चाहिए।',
  '<a%s>कॉन्फ़िगर</a> %s में %s।',
  '%s को डिसेबल करें या %s या %s एक्सटेंशन्स को एनेबल करें।',
  'संख्याएं',
  'तिथि और समय',
  'स्ट्रिंग्स',
  'सूचियां',
  'बाइनरी',
  'ज्यामिति',
  'ltr',
  'आप ऑफ़लाइन हैं।',
  'लॉगआउट',
  'बहुत अधिक असफल लॉगिन प्रयास, %d मिनट बाद पुनः प्रयास करें।',
  'सफलतापूर्वक लॉगआउट हो गया।',
  'एडमिनर उपयोग करने के लिए धन्यवाद, <a href="https://www.adminer.org/en/donation/">दान</a> करने पर विचार करें।',
  'सेशन समाप्त, कृपया फिर से लॉगिन करें।',
  'मास्टर पासवर्ड समाप्त हो गया। इसे स्थायी बनाने के लिए %s मेथड <a href="https://www.adminer.org/en/extension/"%s>इम्प्लीमेंट</a> करें।',
  'सेशन सपोर्ट सक्षम होना चाहिए।',
  'यह क्रिया उसी क्रेडेंशियल्स से सफल लॉगिन के बाद की जाएगी।',
  'कोई एक्सटेंशन नहीं',
  'कोई समर्थित PHP एक्सटेंशन (%s) उपलब्ध नहीं है।',
  'प्रिविलेज्ड पोर्ट्स से कनेक्ट करने की अनुमति नहीं है।',
  'गलत पासवर्ड।',
  'इनपुट पासवर्ड में एक स्पेस है जो कारण हो सकता है।',
  'अमान्य CSRF टोकन। फॉर्म फिर से भेजें।',
  'अनुमत फील्ड्स की अधिकतम संख्या पार हो गई। कृपया %s बढ़ाएं।',
  'अगर आपने यह अनुरोध एडमिनर से नहीं भेजा है तो इस पेज को बंद करें।',
  'बहुत बड़ा POST डेटा। डेटा कम करें या %s कॉन्फ़िगरेशन निर्देश बढ़ाएं।',
  'आप एक बड़ी SQL फ़ाइल FTP के माध्यम से अपलोड कर सकते हैं और सर्वर से इम्पोर्ट कर सकते हैं।',
  'फॉरेन की',
  'कॉलेशन',
  'ऑन अपडेट',
  'ऑन डिलीट',
  'कॉलम का नाम',
  'पैरामीटर नाम',
  'लंबाई',
  'विकल्प',
  'अगला जोड़ें',
  'ऊपर ले जाएं',
  'नीचे ले जाएं',
  'हटाएं',
  'अमान्य डेटाबेस।',
  'डेटाबेस हटा दिए गए हैं।',
  'डेटाबेस चुनें',
  'डेटाबेस बनाएं',
  'प्रक्रिया सूची',
  'चर',
  'स्थिति',
  'संस्करण %s: %s, PHP एक्सटेंशन %s के माध्यम से',
  '%s के रूप में लॉगिन',
  'ताज़ा करें',
  'कॉलेशन',
  'टेबल्स',
  'आकार',
  'कम्प्यूट',
  'चयनित',
  'हटाएं',
  'लोडेड प्लगइन्स',
  'स्क्रीनशॉट',
  'मटेरियलाइज़्ड व्यू',
  'व्यू',
  'टेबल',
  'इनहेरिट करता है',
  'इंडेक्स',
  'इंडेक्स बदलें',
  'स्रोत',
  'लक्ष्य',
  'बदलें',
  'फॉरेन की जोड़ें',
  'चेक्स',
  'चेक बनाएँ',
  'ट्रिगर्स',
  'ट्रिगर जोड़ें',
  'Inherited by',
  'स्थायी लिंक',
  'आउटपुट',
  'प्रारूप',
  'डेटा',
  'उपयोगकर्ता बनाएं',
  'संलग्न क्वेरीज़ समर्थित नहीं हैं।',
  'क्वेरी में त्रुटि',
  '%d / ',
  [
    '%d पंक्ति',
    '%d पंक्तियां',
  ],
  [
    'क्वेरी सफलतापूर्वक निष्पादित, %d पंक्ति प्रभावित।',
    'क्वेरी सफलतापूर्वक निष्पादित, %d पंक्तियां प्रभावित।',
  ],
  'निष्पादित करने के लिए कोई कमांड नहीं।',
  [
    '%d क्वेरी सफलतापूर्वक निष्पादित।',
    '%d क्वेरीज़ सफलतापूर्वक निष्पादित।',
  ],
  'निष्पादित करें',
  'पंक्तियाँ सीमित करें',
  'फाइल अपलोड',
  'सर्वर से',
  'वेबसर्वर फाइल %s',
  'फाइल चलाएं',
  'त्रुटि पर रुकें',
  'केवल त्रुटियां दिखाएं',
  'इतिहास',
  'साफ़ करें',
  'सभी संपादित करें',
  'आइटम हटा दिया गया है।',
  'आइटम अपडेट किया गया है।',
  'आइटम%s डाला गया है।',
  'टेबल हटा दिया गया है।',
  'टेबल बदल दिया गया है।',
  'टेबल बनाया गया है।',
  'टेबल का नाम',
  'इंजन',
  'डिफ़ॉल्ट मान',
  '%s हटाएँ?',
  'द्वारा विभाजन',
  'पार्टीशन्स',
  'पार्टीशन नाम',
  'मान',
  'इंडेक्स बदल दिए गए हैं।',
  'इंडेक्स प्रकार',
  'एल्गोरिदम',
  'कॉलम',
  'लंबाई',
  'नाम',
  'Condition',
  'डेटाबेस हटा दिया गया है।',
  'डेटाबेस का नाम बदल दिया गया है।',
  'डेटाबेस बनाया गया है।',
  'डेटाबेस बदल दिया गया है।',
  'कॉल',
  [
    'रूटीन कॉल किया गया, %d पंक्ति प्रभावित।',
    'रूटीन कॉल किया गया, %d पंक्तियां प्रभावित।',
  ],
  'फॉरेन की हटा दी गई है।',
  'फॉरेन की बदल दी गई है।',
  'फॉरेन की बनाई गई है।',
  'स्रोत और लक्ष्य कॉलम्स का डेटा प्रकार समान होना चाहिए, लक्ष्य कॉलम्स पर एक इंडेक्स होना चाहिए और संदर्भित डेटा मौजूद होना चाहिए।',
  'फॉरेन की',
  'लक्ष्य टेबल',
  'बदलें',
  'कॉलम जोड़ें',
  'व्यू बदल दिया गया है।',
  'व्यू हटा दिया गया है।',
  'व्यू बनाया गया है।',
  'व्यू बनाएं',
  'घटना हटा दी गई है।',
  'घटना बदल दी गई है।',
  'घटना बनाई गई है।',
  'घटना बदलें',
  'घटना बनाएं',
  'शुरू',
  'समाप्त',
  'हर',
  'पूरा होने पर संरक्षित करें',
  'रूटीन हटा दिया गया है।',
  'रूटीन बदल दिया गया है।',
  'रूटीन बनाया गया है।',
  'फंक्शन बदलें',
  'प्रक्रिया बदलें',
  'फंक्शन बनाएं',
  'प्रक्रिया बनाएं',
  'वापसी प्रकार',
  'चेक हटा दिया गया है।',
  'चेक को बदल दिया गया है।',
  'चेक बनाया गया है।',
  'चेक बदलें',
  'ट्रिगर हटा दिया गया है।',
  'ट्रिगर बदल दिया गया है।',
  'ट्रिगर बनाया गया है।',
  'ट्रिगर बदलें',
  'ट्रिगर बनाएं',
  'समय',
  'घटना',
  'उपयोगकर्ता हटा दिया गया है।',
  'उपयोगकर्ता बदल दिया गया है।',
  'उपयोगकर्ता बनाया गया है।',
  'हैश्ड',
  'रूटीन',
  'अनुदान',
  'रद्द करें',
  [
    '%d प्रक्रिया समाप्त की गई है।',
    '%d प्रक्रियाएं समाप्त की गई हैं।',
  ],
  'क्लोन',
  'कुल %d',
  'समाप्त करें',
  '%d आइटम प्रभावित हुए हैं।',
  'किसी मान को संशोधित करने के लिए Ctrl+क्लिक करें।',
  'फ़ाइल UTF-8 एन्कोडिंग में होनी चाहिए।',
  [
    '%d पंक्ति आयात की गई है।',
    '%d पंक्तियां आयात की गई हैं।',
  ],
  'टेबल चुनने में असमर्थ',
  'संशोधित करें',
  'संबंध',
  'संपादित करें',
  'इस मान को संशोधित करने के लिए संपादन लिंक का उपयोग करें।',
  'और डेटा लोड करें',
  'लोड हो रहा है',
  'पृष्ठ',
  'अंतिम',
  'पूरा परिणाम',
  'टेबल्स ट्रंकेट कर दिए गए हैं।',
  'टेबल्स स्थानांतरित कर दिए गए हैं।',
  'टेबल्स कॉपी कर दिए गए हैं।',
  'टेबल्स हटा दिए गए हैं।',
  'टेबल्स को ऑप्टिमाइज़ कर दिया गया है।',
  'स्कीमा',
  'टेबल्स और व्यूज',
  'टेबल्स में डेटा खोजें',
  'इंजन',
  'डेटा लंबाई',
  'इंडेक्स लंबाई',
  'डेटा मुक्त',
  'पंक्तियां',
  'वैक्यूम',
  'अनुकूलित',
  'जांच',
  'विश्लेषण',
  'मरम्मत',
  'ट्रंकेट',
  'अन्य डेटाबेस में स्थानांतरित करें',
  'स्थानांतरित करें',
  'कॉपी',
  'ओवरराइट',
  'अनुसूची',
  'निर्धारित समय पर',
  'नहीं',
];
		case "hu": return [
  '%.3f másodperc',
  'Nem tudom feltölteni a fájlt.',
  'A maximális fájlméret %s B.',
  'A fájl nem létezik.',
  ' ',
  '0123456789',
  'Felhasználói típus',
  'Biztos benne?',
  'Increase %s.',
  'A fájl feltöltés le van tiltva.',
  'eredeti',
  'Nincs tábla.',
  'Szerkeszt',
  'Beszúr',
  'Nincs megjeleníthető eredmény.',
  'You have no privileges to update this table.',
  'Mentés',
  'Mentés és szerkesztés folytatása',
  'Mentés és újat beszúr',
  'Saving',
  'Törlés',
  'Nyelv',
  'Használ',
  'Unknown error.',
  'Adatbázis',
  'Szerver',
  'hostname[:port] or :socket',
  'Felhasználó',
  'Jelszó',
  'Adatbázis',
  'Belépés',
  'Emlékezz rám',
  'Adminer does not support accessing a database without a password, <a href="https://www.adminer.org/en/password/"%s>more information</a>.',
  'Tartalom',
  'Struktúra',
  'Nézet módosítása',
  'Tábla módosítása',
  'Új tétel',
  'Warnings',
  [
    '%d bájt',
    '%d bájt',
    '%d bájt',
  ],
  'Oszlop',
  'Típus',
  'Megjegyzés',
  'Automatikus növelés',
  'Default value',
  'Kiválasztás',
  'Funkciók',
  'Aggregálás',
  'Keresés',
  'bárhol',
  'Sorba rendezés',
  'csökkenő',
  'korlát',
  'Szöveg hossz',
  'Művelet',
  'Full table scan',
  'SQL parancs',
  'megnyit',
  'ment',
  'Adatbázis módosítása',
  'Séma módosítása',
  'Séma létrehozása',
  'Adatbázis séma',
  'Privilégiumok',
  'Rutinok',
  'Sorozatok',
  'Esemény',
  'Importálás',
  'Export',
  'Tábla létrehozása',
  'DB',
  'kiválasztás',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  'Disable %s or enable %s or %s extensions.',
  'Szám',
  'Dátum és idő',
  'Szöveg',
  'Lista',
  'Bináris',
  'Geometria',
  'ltr',
  'You are offline.',
  'Kilépés',
  'Too many unsuccessful logins, try again in %d minute(s).',
  'Sikeres kilépés.',
  'Thanks for using Adminer, consider <a href="https://www.adminer.org/en/donation/">donating</a>.',
  'Munkamenet lejárt, jelentkezz be újra.',
  'Master password expired. <a href="https://www.adminer.org/en/extension/"%s>Implement</a> %s method to make it permanent.',
  'A munkameneteknek (session) engedélyezve kell lennie.',
  'The action will be performed after successful login with the same credentials.',
  'Nincs kiterjesztés',
  'Nincs egy elérhető támogatott PHP kiterjesztés (%s) sem.',
  'Connecting to privileged ports is not allowed.',
  'Érvénytelen adatok.',
  'There is a space in the input password which might be the cause.',
  'Érvénytelen CSRF azonosító. Küldd újra az űrlapot.',
  'A maximális mezőszámot elérted. Növeld meg ezeket: %s.',
  'If you did not send this request from Adminer then close this page.',
  'Túl sok a POST adat! Csökkentsd az adat méretét, vagy növeld a %s beállítást.',
  'You can upload a big SQL file via FTP and import it from server.',
  'Idegen kulcs',
  'egybevetés',
  'frissítéskor',
  'törléskor',
  'Oszlop neve',
  'Paraméter neve',
  'Hossz',
  'Opciók',
  'Következő hozzáadása',
  'Felfelé',
  'Lefelé',
  'Eltávolítás',
  'Érvénytelen adatbázis.',
  'Adatbázis eldobva.',
  'Adatbázis kiválasztása',
  'Adatbázis létrehozása',
  'Folyamatok',
  'Változók',
  'Állapot',
  '%s verzió: %s, PHP: %s',
  'Belépve: %s',
  'Frissítés',
  'Egybevetés',
  'Táblák',
  'Size',
  'Compute',
  'Selected',
  'Eldob',
  'Loaded plugins',
  'screenshot',
  'Materialized view',
  'Nézet',
  'Tábla',
  'Inherits from',
  'Indexek',
  'Index módosítása',
  'Forrás',
  'Cél',
  'Módosítás',
  'Idegen kulcs hozzadása',
  'Checks',
  'Create check',
  'Trigger',
  'Trigger hozzáadása',
  'Inherited by',
  'Hivatkozás',
  'Kimenet',
  'Formátum',
  'Adat',
  'Felhasználó hozzáadása',
  'ATTACH queries are not supported.',
  'Hiba a lekérdezésben',
  '%d / ',
  [
    '%d sor',
    '%d sor',
    '%d sor',
  ],
  [
    'Lekérdezés sikeresen végrehajtva, %d sor érintett.',
    'Lekérdezés sikeresen végrehajtva, %d sor érintett.',
    'Lekérdezés sikeresen végrehajtva, %d sor érintett.',
  ],
  'Nincs végrehajtható parancs.',
  '%d sikeres lekérdezés.',
  'Végrehajt',
  'Limit rows',
  'Fájl feltöltése',
  'Szerverről',
  'Webszerver fájl %s',
  'Fájl futtatása',
  'Hiba esetén megáll',
  'Csak a hibák mutatása',
  'Történet',
  'Törlés',
  'Összes szerkesztése',
  'A tétel törölve.',
  'A tétel frissítve.',
  '%s tétel beszúrva.',
  'A tábla eldobva.',
  'A tábla módosult.',
  'A tábla létrejött.',
  'Tábla név',
  'motor',
  'Alapértelmezett értékek',
  'Drop %s?',
  'Particionálás ezzel',
  'Particiók',
  'Partició neve',
  'Értékek',
  'Az indexek megváltoztak.',
  'Index típusa',
  'Algorithm',
  'Columns',
  'méret',
  'Név',
  'Condition',
  'Az adatbázis eldobva.',
  'Az adadtbázis átnevezve.',
  'Az adatbázis létrejött.',
  'Az adatbázis módosult.',
  'Meghív',
  [
    'Rutin meghívva, %d sor érintett.',
    'Rutin meghívva, %d sor érintett.',
    'Rutin meghívva, %d sor érintett.',
  ],
  'Idegen kulcs eldobva.',
  'Idegen kulcs módosult.',
  'Idegen kulcs létrejött.',
  'A forrás és cél oszlopoknak azonos típusúak legyenek, a cél oszlopok indexeltek legyenek, és a hivatkozott adatnak léteznie kell.',
  'Idegen kulcs',
  'Cél tábla',
  'Változtat',
  'Oszlop hozzáadása',
  'A nézet módosult.',
  'A nézet eldobva.',
  'A nézet létrejött.',
  'Nézet létrehozása',
  'Az esemény eldobva.',
  'Az esemény módosult.',
  'Az esemény létrejött.',
  'Esemény módosítása',
  'Esemény létrehozása',
  'Kezd',
  'Vége',
  'Minden',
  'Befejezéskor megőrzi',
  'A rutin eldobva.',
  'A rutin módosult.',
  'A rutin létrejött.',
  'Funkció módosítása',
  'Eljárás módosítása',
  'Funkció létrehozása',
  'Eljárás létrehozása',
  'Visszatérési érték',
  'Check has been dropped.',
  'Check has been altered.',
  'Check has been created.',
  'Alter check',
  'A trigger eldobva.',
  'A trigger módosult.',
  'A trigger létrejött.',
  'Trigger módosítása',
  'Trigger létrehozása',
  'Idő',
  'Esemény',
  'A felhasználó eldobva.',
  'A felhasználó módosult.',
  'A felhasználó létrejött.',
  'Hashed',
  'Rutin',
  'Engedélyezés',
  'Visszavonás',
  [
    '%d folyamat leállítva.',
    '%d folyamat leállítva.',
    '%d folyamat leállítva.',
  ],
  'Klónoz',
  'összesen %d',
  'Leállít',
  [
    '%d tétel érintett.',
    '%d tétel érintett.',
    '%d tétel érintett.',
  ],
  'Ctrl+click on a value to modify it.',
  'File must be in UTF-8 encoding.',
  [
    '%d sor importálva.',
    '%d sor importálva.',
    '%d sor importálva.',
  ],
  'Nem tudom kiválasztani a táblát',
  'Modify',
  'Reláció',
  'szerkeszt',
  'Használd a szerkesztés hivatkozást ezen érték módosításához.',
  'Load more data',
  'Loading',
  'oldal',
  'utolsó',
  'Összes eredményt mutatása',
  'A tábla felszabadítva.',
  'Táblák áthelyezve.',
  'Táblák átmásolva.',
  'Táblák eldobva.',
  'Tables have been optimized.',
  'Séma',
  'Táblák és nézetek',
  'Keresés a táblákban',
  'Motor',
  'Méret',
  'Index hossz',
  'Adat szabad',
  'Sorok',
  'Vacuum',
  'Optimalizál',
  'Ellenőrzés',
  'Elemzés',
  'Javít',
  'Felszabadít',
  'Áthelyezés másik adatbázisba',
  'Áthelyez',
  'Másolás',
  'overwrite',
  'Ütemzés',
  'Megadott időben',
  'óó:pp:mm',
];
		case "id": return [
  '%.3f s',
  'Tidak dapat mengunggah berkas.',
  'Besar berkas yang diizinkan adalah %sB.',
  'Berkas tidak ada.',
  '.',
  '0123456789',
  'Jenis pengguna',
  'Anda yakin?',
  'Increase %s.',
  'Pengunggahan berkas dimatikan.',
  'asli',
  'Tidak ada tabel.',
  'Sunting',
  'Sisipkan',
  'Tidak ada baris.',
  'You have no privileges to update this table.',
  'Simpan',
  'Simpan dan lanjut menyunting',
  'Simpan dan sisipkan berikutnya',
  'Saving',
  'Hapus',
  'Bahasa',
  'Gunakan',
  'Unknown error.',
  'Sistem',
  'Server',
  'hostname[:port] or :socket',
  'Pengguna',
  'Sandi',
  'Basis data',
  'Masuk',
  'Masuk permanen',
  'Adminer does not support accessing a database without a password, <a href="https://www.adminer.org/en/password/"%s>more information</a>.',
  'Pilih data',
  'Lihat struktur',
  'Ubah tampilan',
  'Ubah tabel',
  'Entri baru',
  'Warnings',
  '%d bita',
  'Kolom',
  'Jenis',
  'Komentar',
  'Inkrementasi Otomatis',
  'Default value',
  'Pilih',
  'Fungsi',
  'Agregasi',
  'Cari',
  'di mana pun',
  'Urutkan',
  'menurun',
  'Batas',
  'Panjang teks',
  'Tindakan',
  'Pindai tabel lengkap',
  'Perintah SQL',
  'buka',
  'simpan',
  'Ubah basis data',
  'Ubah skema',
  'Buat skema',
  'Skema basis data',
  'Privilese',
  'Rutin',
  'Deret',
  'Even',
  'Impor',
  'Ekspor',
  'Buat tabel',
  'DB',
  'pilih',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  'Disable %s or enable %s or %s extensions.',
  'Angka',
  'Tanggal dan waktu',
  'String',
  'Daftar',
  'Binari',
  'Geometri',
  'ltr',
  'You are offline.',
  'Keluar',
  'Too many unsuccessful logins, try again in %d minute(s).',
  'Berhasil keluar.',
  'Thanks for using Adminer, consider <a href="https://www.adminer.org/en/donation/">donating</a>.',
  'Sesi habis, silakan masuk lagi.',
  'Master password expired. <a href="https://www.adminer.org/en/extension/"%s>Implement</a> %s method to make it permanent.',
  'Dukungan sesi harus aktif.',
  'The action will be performed after successful login with the same credentials.',
  'Ekstensi tidak ada',
  'Ekstensi PHP yang didukung (%s) tidak ada.',
  'Connecting to privileged ports is not allowed.',
  'Akses tidak sah.',
  'There is a space in the input password which might be the cause.',
  'Token CSRF tidak sah. Kirim ulang formulir.',
  'Sudah lebih dumlah ruas maksimum yang diizinkan. Harap naikkan %s.',
  'If you did not send this request from Adminer then close this page.',
  'Data POST terlalu besar. Kurangi data atau perbesar direktif konfigurasi %s.',
  'You can upload a big SQL file via FTP and import it from server.',
  'Kunci asing',
  'kolasi',
  'ON UPDATE',
  'ON DELETE',
  'Nama kolom',
  'Nama parameter',
  'Panjang',
  'Opsi',
  'Tambah setelahnya',
  'Naik',
  'Turun',
  'Hapus',
  'Basis data tidak sah.',
  'Basis data berhasil dihapus.',
  'Pilih basis data',
  'Buat basis data',
  'Daftar proses',
  'Variabel',
  'Status',
  'Versi %s: %s dengan ekstensi PHP %s',
  'Masuk sebagai: %s',
  'Segarkan',
  'Kolasi',
  'Tabel',
  'Size',
  'Compute',
  'Selected',
  'Hapus',
  'Loaded plugins',
  'screenshot',
  'Materialized view',
  'Tampilan',
  'Tabel',
  'Inherits from',
  'Indeks',
  'Ubah indeks',
  'Sumber',
  'Sasaran',
  'Ubah',
  'Tambah kunci asing',
  'Checks',
  'Create check',
  'Pemicu',
  'Tambah pemicu',
  'Inherited by',
  'Pranala permanen',
  'Hasil',
  'Format',
  'Data',
  'Buat pengguna',
  'ATTACH queries are not supported.',
  'Galat dalam kueri',
  '%d / ',
  '%d baris',
  'Kueri berhasil, %d baris terpengaruh.',
  'Tidak ada perintah untuk dijalankan.',
  '%d kueri berhasil dijalankan.',
  'Jalankan',
  'Limit rows',
  'Unggah berkas',
  'Dari server',
  'Berkas server web %s',
  'Jalankan berkas',
  'Hentikan jika galat',
  'Hanya tampilkan galat',
  'Riwayat',
  'Bersihkan',
  'Sunting semua',
  'Entri berhasil dihapus.',
  'Entri berhasil diperbarui.',
  'Entri%s berhasil disisipkan.',
  'Tabel berhasil dihapus.',
  'Tabel berhasil diubah.',
  'Tabel berhasil dibuat.',
  'Nama tabel',
  'mesin',
  'Nilai bawaan',
  'Drop %s?',
  'Partisi menurut',
  'Partisi',
  'Nama partisi',
  'Nilai',
  'Indeks berhasil diubah.',
  'Jenis Indeks',
  'Algorithm',
  'Columns',
  'panjang',
  'Nama',
  'Condition',
  'Basis data berhasil dihapus.',
  'Basis data berhasil diganti namanya.',
  'Basis data berhasil dibuat.',
  'Basis data berhasil diubah.',
  'Panggilan',
  'Rutin telah dipanggil, %d baris terpengaruh.',
  'Kunci asing berhasil dihapus.',
  'Kunci asing berhasil diubah.',
  'Kunci asing berhasil dibuat.',
  'Kolom sumber dan sasaran harus memiliki jenis data yang sama. Kolom sasaran harus memiliki indeks dan data rujukan harus ada.',
  'Kunci asing',
  'Tabel sasaran',
  'Ubah',
  'Tambah kolom',
  'Tampilan berhasil diubah.',
  'Tampilan berhasil dihapus.',
  'Tampilan berhasil dibuat.',
  'Buat tampilan',
  'Even berhasil dihapus.',
  'Even berhasil diubah.',
  'Even berhasil dibuat.',
  'Ubah even',
  'Buat even',
  'Mulai',
  'Selesai',
  'Setiap',
  'Pertahankan saat selesai',
  'Rutin berhasil dihapus.',
  'Rutin berhasil diubah.',
  'Rutin berhasil dibuat.',
  'Ubah fungsi',
  'Ubah prosedur',
  'Buat fungsi',
  'Buat prosedur',
  'Jenis pengembalian',
  'Check has been dropped.',
  'Check has been altered.',
  'Check has been created.',
  'Alter check',
  'Pemicu berhasil dihapus.',
  'Pemicu berhasil diubah.',
  'Pemicu berhasil dibuat.',
  'Ubah pemicu',
  'Buat pemicu',
  'Waktu',
  'Even',
  'Pengguna berhasil dihapus.',
  'Pengguna berhasil diubah.',
  'Pengguna berhasil dibuat.',
  'Hashed*',
  'Rutin',
  'Beri',
  'Tarik',
  '%d proses berhasil dihentikan.',
  'Gandakan',
  '%d total',
  'Hentikan',
  '%d entri terpengaruh.',
  'Ctrl+click on a value to modify it.',
  'File must be in UTF-8 encoding.',
  '%d baris berhasil diimpor.',
  'Gagal memilih tabel',
  'Modify',
  'Relasi',
  'sunting',
  'Gunakan pranala suntingan untuk mengubah nilai ini.',
  'Load more data',
  'Loading',
  'Halaman',
  'terakhir',
  'Seluruh hasil',
  'Tabel berhasil dikosongkan.',
  'Tabel berhasil dipindahkan.',
  'Tabel berhasil disalin.',
  'Tabel berhasil dihapus.',
  'Tabel berhasil dioptimalkan.',
  'Skema',
  'Tabel dan tampilan',
  'Cari data dalam tabel',
  'Mesin',
  'Panjang Data',
  'Panjang Indeks',
  'Data Bebas',
  'Baris',
  'Vacuum',
  'Optimalkan',
  'Periksa',
  'Analisis',
  'Perbaiki',
  'Kosongkan',
  'Pindahkan ke basis data lain',
  'Pindahkan',
  'Salin',
  'overwrite',
  'Jadwal',
  'Pada waktu tertentu',
  'Ubah jenis',
];
		case "it": return [
  '%.3f s',
  'Caricamento del file non riuscito.',
  'La dimensione massima del file è %sB.',
  'Il file non esiste.',
  '.',
  '0123456789',
  'Tipi definiti dall\'utente',
  'Sicuro?',
  'Increase %s.',
  'Caricamento file disabilitato.',
  'originale',
  'No tabelle.',
  'Modifica',
  'Inserisci',
  'Nessuna riga.',
  'Non hai i privilegi per aggiornare questa tabella.',
  'Salva',
  'Salva e continua',
  'Salva e inserisci un altro',
  'Salvataggio',
  'Elimina',
  'Lingua',
  'Usa',
  'Errore sconosciuto.',
  'Sistema',
  'Server',
  'hostname[:port] or :socket',
  'Utente',
  'Password',
  'Database',
  'Autenticazione',
  'Login permanente',
  'Adminer non supporta accesso a databse senza password, <a href="https://www.adminer.org/it/password/"%s>piú informazioni</a>.',
  'Visualizza dati',
  'Visualizza struttura',
  'Modifica vista',
  'Modifica tabella',
  'Nuovo elemento',
  'Attenzione',
  [
    '%d byte',
    '%d bytes',
  ],
  'Colonna',
  'Tipo',
  'Commento',
  'Auto incremento',
  'Valore predefinito',
  'Seleziona',
  'Funzioni',
  'Aggregazione',
  'Cerca',
  'ovunque',
  'Ordina',
  'discendente',
  'Limite',
  'Lunghezza testo',
  'Azione',
  'Analizza intera tabella',
  'Comando SQL',
  'apri',
  'salva',
  'Modifica database',
  'Modifica schema',
  'Crea schema',
  'Schema database',
  'Privilegi',
  'Routine',
  'Sequenza',
  'Eventi',
  'Importa',
  'Esporta',
  'Crea tabella',
  'DB',
  'seleziona',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  'Disabilita %s o abilita %s oppure %s estensioni.',
  'Numeri',
  'Data e ora',
  'Stringhe',
  'Liste',
  'Binari',
  'Geometria',
  'ltr',
  'Sei disconnesso.',
  'Esci',
  [
    'Troppi tentativi infruttuosi di login, si prega di riprovare in %d minuto.',
    'Troppi tentativi infruttuosi di login, si prega di riprovare in %d minuti.',
  ],
  'Uscita effettuata con successo.',
  'Thanks for using Adminer, consider <a href="https://www.adminer.org/en/donation/">donating</a>.',
  'Sessione scaduta, autenticarsi di nuovo.',
  'La password principale é scaduta. <a href="https://www.adminer.org/it/extension/"%s>Implementare</a> %s come metodo per renderla permanente.',
  'Le sessioni devono essere abilitate.',
  'La azione verrá eseguita dopo un login valido con le stesse credenziali.',
  'Estensioni non presenti',
  'Nessuna delle estensioni PHP supportate (%s) disponibile.',
  'LA connessione a porte privilegiate non é permessa.',
  'Credenziali non valide.',
  'Esiste uno spazio nella passoword inserita che potrebbe essere la causa.',
  'Token CSRF non valido. Reinvia la richiesta.',
  'Troppi campi. Per favore aumentare %s.',
  'Se non hai inviato tu la richiesta tramite Adminer puoi chiudere la pagina.',
  'Troppi dati via POST. Ridurre i dati o aumentare la direttiva di configurazione %s.',
  'Puoi caricare un grande file SQL tramite FTP ed impirtarlo dal server.',
  'Chiavi esterne',
  'collazione',
  'ON UPDATE',
  'ON DELETE',
  'Nome colonna',
  'Nome parametro',
  'Lunghezza',
  'Opzioni',
  'Aggiungi altro',
  'Sposta su',
  'Sposta giu',
  'Rimuovi',
  'Database non valido.',
  'Database eliminati.',
  'Seleziona database',
  'Crea database',
  'Elenco processi',
  'Variabili',
  'Stato',
  'Versione %s: %s via estensione PHP %s',
  'Autenticato come: %s',
  'Aggiorna',
  'Collazione',
  'Tabelle',
  'Taglia',
  'Elabora',
  'Selezionato',
  'Elimina',
  'Loaded plugins',
  'screenshot',
  'Vista materializzata',
  'Vedi',
  'Tabella',
  'Inherits from',
  'Indici',
  'Modifica indici',
  'Sorgente',
  'Obiettivo',
  'Modifica',
  'Aggiungi foreign key',
  'Checks',
  'Create check',
  'Trigger',
  'Aggiungi trigger',
  'Inherited by',
  'Link permanente',
  'Risultato',
  'Formato',
  'Dati',
  'Crea utente',
  'ATTACH queries non sono supportate.',
  'Errore nella query',
  '%d / ',
  [
    '%d riga',
    '%d righe',
  ],
  [
    'Esecuzione della query OK, %d riga interessata.',
    'Esecuzione della query OK, %d righe interessate.',
  ],
  'Nessun commando da eseguire.',
  [
    '%d query eseguita con successo.',
    '%d query eseguite con successo.',
  ],
  'Esegui',
  'Limite righe',
  'Caricamento file',
  'Dal server',
  'Webserver file %s',
  'Esegui file',
  'Stop su errore',
  'Mostra solo gli errori',
  'Storico',
  'Pulisci',
  'Modifica tutto',
  'Elemento eliminato.',
  'Elemento aggiornato.',
  'Elemento%s inserito.',
  'Tabella eliminata.',
  'Tabella modificata.',
  'Tabella creata.',
  'Nome tabella',
  'motore',
  'Valori predefiniti',
  'Scartare %s?',
  'Partiziona per',
  'Partizioni',
  'Nome partizione',
  'Valori',
  'Indici modificati.',
  'Tipo indice',
  'Algorithm',
  'Columns',
  'lunghezza',
  'Nome',
  'Condition',
  'Database eliminato.',
  'Database rinominato.',
  'Database creato.',
  'Database modificato.',
  'Chiama',
  [
    'Routine chiamata, %d riga interessata.',
    'Routine chiamata, %d righe interessate.',
  ],
  'Foreign key eliminata.',
  'Foreign key modificata.',
  'Foreign key creata.',
  'Le colonne sorgente e destinazione devono essere dello stesso tipo e ci deve essere un indice sulla colonna di destinazione e sui dati referenziati.',
  'Foreign key',
  'Tabella obiettivo',
  'Cambia',
  'Aggiungi colonna',
  'Vista modificata.',
  'Vista eliminata.',
  'Vista creata.',
  'Crea vista',
  'Evento eliminato.',
  'Evento modificato.',
  'Evento creato.',
  'Modifica evento',
  'Crea evento',
  'Inizio',
  'Fine',
  'Ogni',
  'Al termine preservare',
  'Routine eliminata.',
  'Routine modificata.',
  'Routine creata.',
  'Modifica funzione',
  'Modifica procedura',
  'Crea funzione',
  'Crea procedura',
  'Return type',
  'Check has been dropped.',
  'Check has been altered.',
  'Check has been created.',
  'Alter check',
  'Trigger eliminato.',
  'Trigger modificato.',
  'Trigger creato.',
  'Modifica trigger',
  'Crea trigger',
  'Orario',
  'Evento',
  'Utente eliminato.',
  'Utente modificato.',
  'Utente creato.',
  'Hashed',
  'Routine',
  'Permetti',
  'Revoca',
  [
    '%d processo interrotto.',
    '%d processi interrotti.',
  ],
  'Clona',
  '%d in totale',
  'Interrompi',
  [
    'Il risultato consiste in %d elemento.',
    'Il risultato consiste in %d elementi.',
  ],
  'Fai Ctrl+click su un valore per modificarlo.',
  'Il file deve avere codifica UTF-8.',
  [
    '%d riga importata.',
    '%d righe importate.',
  ],
  'Selezione della tabella non riuscita',
  'Modifica',
  'Relazioni',
  'modifica',
  'Usa il link modifica per modificare questo valore.',
  'Carica piú dati',
  'Caricamento',
  'Pagina',
  'ultima',
  'Intero risultato',
  'Le tabelle sono state svuotate.',
  'Le tabelle sono state spostate.',
  'Le tabelle sono state copiate.',
  'Le tabelle sono state eliminate.',
  'Le tabelle sono state ottimizzate.',
  'Schema',
  'Tabelle e viste',
  'Cerca nelle tabelle',
  'Motore',
  'Lunghezza dato',
  'Lunghezza indice',
  'Dati liberi',
  'Righe',
  'Aspira',
  'Ottimizza',
  'Controlla',
  'Analizza',
  'Ripara',
  'Svuota',
  'Sposta in altro database',
  'Sposta',
  'Copia',
  'sovrascrivi',
  'Pianifica',
  'A tempo prestabilito',
  'no',
];
		case "ja": return [
  '%.3f 秒',
  'ファイルをアップロードできません。',
  '最大ファイルサイズは %sB です。',
  'ファイルは存在しません。',
  ',',
  '0123456789',
  'ユーザー定義型',
  '実行しますか？',
  'Increase %s.',
  'ファイルのアップロードが無効です。',
  '元',
  'テーブルがありません。',
  '編集',
  '挿入',
  '行がありません。',
  'このテーブルを更新する権限がありません。',
  '保存',
  '保存して継続',
  '保存／追加',
  '保存しています...',
  '削除',
  '言語',
  '使用',
  '不明なエラーです。',
  'データベース種類',
  'サーバー',
  'hostname[:port] or :socket',
  'ユーザー名',
  'パスワード',
  'データベース',
  'ログイン',
  '永続的にログイン',
  'Adminer はパスワードのないデータベースへの接続には対応していません。(<a href="https://www.adminer.org/en/password/"%s>詳細</a>)',
  'データ',
  'スキーマ',
  'ビューを変更',
  'テーブルの設定を変更',
  '新規レコードを挿入',
  '警告',
  '%d バイト',
  'カラム',
  '型',
  'コメント',
  '連番',
  '既定値',
  '選択',
  '関数',
  '集約関数',
  '検索',
  '任意',
  'ソート',
  '降順',
  '制約',
  '文字数を丸める',
  '動作',
  'テーブルを全スキャン',
  'SQLコマンド',
  'ブラウザに表示',
  '保存',
  'データベースの設定を変更',
  'スキーマ変更',
  'スキーマ追加',
  'スキーマ',
  '権限',
  'ルーチン',
  'シーケンス',
  'イベント',
  'インポート',
  'エクスポート',
  'テーブルを作成',
  'DB',
  '選択',
  '%s は<a%s>配列を返す</a>必要があります。',
  '%2$s の %1$s を<a%s>設定</a>してください。',
  '%s を無効にするか、拡張機能 %s または %s を有効にしてください。',
  '数字',
  '日時',
  '文字列',
  'リスト',
  'バイナリ',
  'ジオメトリ型',
  'ltr',
  'オフライン状態です。',
  'ログアウト',
  'ログインの失敗数が多すぎます。%d分後に再試行してください。',
  'ログアウトしました。',
  'Adminerのご利用ありがとうございました。(寄付は<a href="https://www.adminer.org/en/donation/">こちら</a>)',
  'セッションの期限切れ。ログインし直してください。',
  'マスタパスワードが期限切れになりました。<a href="https://www.adminer.org/en/extension/"%s>(実装例)</a> 無期限にするには %s 関数を用います。',
  'セッションを有効にしてください。',
  '同じアカウントで正しくログインすると作業を実行します。',
  '拡張機能がありません',
  'PHPの拡張機能（%s）がセットアップされていません。',
  '特権ポートへの接続は許可されていません。',
  '不正なログインです。',
  '入力されたパスワードに空白が含まれているので、それが原因かもしれません。',
  '不正なCSRFトークンです。フォームを再送信してください。',
  '定義可能な最大フィールド数を越えました。%s を増やしてください。',
  'Adminerからのリクエストでない場合はこのページを閉じてください。',
  'POSTデータが大きすぎます。データサイズを小さくするか %s 設定を大きくしてください。',
  '大きなSQLファイルは、FTP経由でアップロードしてサーバからインポートしてください。',
  '外部キー',
  'コレーション',
  'ON UPDATE',
  'ON DELETE',
  'カラム名',
  'パラメータ名',
  '長さ',
  '設定',
  '追加',
  '上',
  '下',
  '除外',
  '不正なデータベースです。',
  'データベースを削除しました。',
  'データベースを選択してください',
  'データベースを作成',
  'プロセス一覧',
  '変数',
  '状態',
  '%sバージョン：%s、 PHP拡張機能 %s',
  'ログ：%s',
  'リフレッシュ',
  'コレーション',
  'テーブル',
  'サイズ',
  '再計算',
  '選択中',
  '削除',
  '読込済プラグイン',
  'スクリーンショット',
  'マテリアライズドビュー',
  'ビュー',
  'テーブル',
  '継承元',
  'インデックス',
  'インデックスを変更',
  'ソース',
  'ターゲット',
  '変更',
  '外部キーを追加',
  'CHECK制約',
  'CHECK制約を追加',
  'トリガー',
  'トリガーを追加',
  'Inherited by',
  '固定リンク',
  '出力',
  '形式',
  'データ',
  'ユーザを作成',
  'ATTACH クエリーは対応していません。',
  'クエリーのエラー',
  '%d / ',
  '%d 行',
  'クエリーを実行しました。%d 行を変更しました。',
  '実行するコマンドがありません。',
  '%d クエリーを実行しました。',
  '実行',
  '表示行数を制限',
  'アップロード',
  'サーバー上のファイル',
  'ファイル名 %s',
  '実行',
  'エラーの場合は停止',
  'エラーのみ表示',
  '履歴',
  '消去',
  '一括編集',
  'レコードを削除しました。',
  'レコードを更新しました。',
  '%sレコードを挿入しました。',
  'テーブルを削除しました。',
  'テーブルの設定を変更しました。',
  'テーブルを作成しました。',
  'テーブル名',
  'エンジン',
  '既定値',
  '%s を削除しますか？',
  'パーティション',
  'パーティション',
  'パーティション名',
  '値',
  'インデックスを変更しました。',
  'インデックスの型',
  'アルゴリズム',
  'カラム',
  '長さ',
  '名称',
  '条件',
  'データベースを削除しました。',
  'データベースの名前を変えました。',
  'データベースを作成しました。',
  'データベースの設定を変更しました。',
  '呼出し',
  'ルーチンを呼びました。%d 行を変更しました。',
  '外部キーを削除しました。',
  '外部キーを変更しました。',
  '外部キーを作成しました。',
  'ソースとターゲットのカラムは同じデータ型でなければなりません。ターゲットカラムにインデックスがあり、データが存在しなければなりません。',
  '外部キー',
  '対象テーブル',
  '変更',
  'カラムを追加',
  'ビューを変更しました。',
  'ビューを削除しました。',
  'ビューを作成しました。',
  'ビューを作成',
  'イベントを削除しました。',
  'イベントを変更しました。',
  'イベントを作成しました。',
  'イベントを変更',
  'イベントを作成',
  '開始',
  '終了',
  '毎回',
  '完成後に保存',
  'ルーチンを削除しました。',
  'ルーチンを変更しました。',
  'ルーチンを作成しました。',
  '関数を変更',
  'プロシージャを変更',
  '関数を作成',
  'プロシージャを作成',
  '戻り値の型',
  'CHECK制約を削除しました。',
  'CHECK制約を編集しました。',
  'CHECK制約を追加しました。',
  'CHECK制約を編集',
  'トリガーを削除しました。',
  'トリガーを変更しました。',
  'トリガーを追加しました。',
  'トリガーを変更',
  'トリガーを作成',
  'タイミング',
  'イベント',
  'ユーザを削除しました。',
  'ユーザを変更しました。',
  'ユーザを作成しました。',
  'Hashed',
  'ルーチン',
  '権限を付与',
  '権限を取り消す',
  '%d プロセスを終了しました。',
  'クローン',
  '合計 %d',
  'プロセスを終了',
  '%d レコードを更新しました。',
  'Ctrl+クリックで値を修正します。',
  'ファイルをUTF-8で保存してください。',
  '%d 行をインポートしました。',
  'テーブルを選択できません',
  '編集',
  '関係',
  '編集',
  'この値を修正するにはリンクを使用してください。',
  'さらにデータを表示',
  '読み込み中',
  'ページ',
  '最終',
  '全結果',
  'テーブルを空にしました。',
  'テーブルを移動しました。',
  'テーブルをコピーしました。',
  'テーブルを削除しました。',
  'テーブルを最適化しました。',
  'スキーマ',
  'テーブルとビュー',
  'データを検索する',
  'エンジン',
  'データ長',
  'インデックス長',
  '空き',
  '行数',
  '不要領域を回収(Vacuum)',
  '最適化',
  '検査',
  '分析',
  '修復',
  '空にする',
  '他のデータベースへ移動',
  '移動',
  'コピー',
  '上書き',
  'スケジュール',
  '指定時刻',
  'いいえ',
];
		case "ka": return [
  '%.3f s',
  'ფაილი არ აიტვირთა სერვერზე.',
  'ფაილის მაქსიმალური ზომა - %sB.',
  'ასეთი ფაილი არ არსებობს.',
  ' ',
  '0123456789',
  'მომხმარებლის სახეობა',
  'ნამდვილად?',
  'Increase %s.',
  'ფაილის სერვერზე ატვირთვა გათიშულია.',
  'საწყისი',
  'ბაზაში ცხრილი არაა.',
  'შეცვლა',
  'ჩასმა',
  'ჩანაწერი არაა.',
  'ამ ცხრილის განახლების უფლება არ გაქვთ.',
  'შენახვა',
  'შენახვა და ცვლილების გაგრძელება',
  'შენახვა და სხვის ჩასმა',
  'შენახვა',
  'წაშლა',
  'ენა',
  'არჩევა',
  'უცნობი შეცდომა.',
  'სისტემა',
  'სერვერი',
  'hostname[:port] or :socket',
  'მომხმარებელი',
  'პაროლი',
  'ბაზა',
  'შესვლა',
  'სისტემაში დარჩენა',
  'უპაროლო წვდომა ბაზასთან არაა დაშვებული Adminer-ში, მეტი ინფორმაციისთვის ეწვიეთ <a href="https://www.adminer.org/en/password/"%s>ბმულს</a>.',
  'არჩევა',
  'სტრუქტურის ჩვენება',
  'წარმოდგენის შეცვლა',
  'ცხრილის შეცვლა',
  'ახალი ჩანაწერი',
  'გაფრთხილება',
  '%d ბაიტი',
  'ველი',
  'სახეობა',
  'კომენტარები',
  'ავტომატურად გაზრდა',
  'სტანდარტული მნიშვნელობა',
  'არჩევა',
  'ფუნქციები',
  'აგრეგაცია',
  'ძებნა',
  'ნებისმიერ ადგილას',
  'დალაგება',
  'კლებადობით',
  'ზღვარი',
  'ტექსტის სიგრძე',
  'მოქმედება',
  'სრული ცხრილის ანალიზი',
  'SQL-ბრძანება',
  'გახსნა',
  'შენახვა',
  'ბაზის შეცვლა',
  'სქემის შეცვლა',
  'ახალი სქემა',
  'ბაზის სქემა',
  'უფლებამოსილება',
  'რუტინები',
  'მიმდევრობა',
  'ღონისძიება',
  'იმპორტი',
  'ექსპორტი',
  'ცხრილის შექმნა',
  'ბაზა',
  'არჩევა',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  'გათიშეთ %s ან ჩართეთ %s ან %s გაფართოება.',
  'ციფრები',
  'დრო და თარიღი',
  'ველები',
  'სია',
  'ორობითი',
  'გეომეტრია',
  'ltr',
  'არ გაგივლიათ ავტორიზაცია.',
  'გასვლა',
  'ძალიან ბევრჯერ შეგეშალათ მომხმარებელი და პაროლი. სცადეთ %d წუთში.',
  'გამოხვედით სისტემიდან.',
  'მადლობას გიხდით Adminer-ით სარგებლობისთვის, გადახედეთ ბმულს <a href="https://www.adminer.org/en/donation/">შემოწირულობა</a>.',
  'სესიის მოქმედების დრო ამოიწურა, გაიარეთ ხელახალი ავტორიზაცია.',
  'ძირითად პაროლს ვადა გაუვიდა. <a href="https://www.adminer.org/en/extension/"%s>გამოიყენეთ</a> მეთოდი %s, რათა ის მუდმივი გახადოთ.',
  'ჩართული უნდა იყოს სესია.',
  'მოქმედება შესრულდება იგივე მომხმარებლით წარმატებული ავტორიზაციის შემდეგ.',
  'გაფართოება არაა',
  'არც ერთი მხარდაჭერილი გაფართოება არ მოიძებნა (%s).',
  'პრივილეგირებულ პორტთან წვდომა დაუშვებელია.',
  'არასწორი მომხმარებელი ან პაროლი.',
  'პაროლში არის გამოტოვება, შეიძლება ეს ქმნის პრობლემას.',
  'უმოქმედო CSRF-ტოკენი. ფორმის კიდევ ერთხელ გაგზავნა.',
  'მიღწეულია დაშვებული ველების მაქსიმალური რაოდენობა, გაზარდეთ %s.',
  'ეს მოთხოვნა თქვენ თუ არ გაგიგზავნაით Adminer-იდან, დახურეთ ეს ფანჯარა..',
  'POST ინფორმაცია ძალიან დიდია. შეამცირეთ ზომა ან გაზარდეს POST ინფორმაციის ზომა პარამეტრებიდან %s.',
  'დიდი ფაილი უნდა ატვირტოთ FTP-თი და შემდეგ გაუკეთოთ იმპორტი სერვერიდან.',
  'გარე გასაღები',
  'კოდირება',
  'განახლებისას',
  'წაშლისას',
  'ველი',
  'პარამეტრი',
  'სიგრძე',
  'მოქმედება',
  'კიდევ დამატება',
  'ზემოთ ატანა',
  'ქვემოთ ჩატანა',
  'წაშლა',
  'არასწორი ბაზა.',
  'ბაზა წაიშალა.',
  'ბაზა',
  'ბაზის შექმნა',
  'პროცესების სია',
  'ცვლადები',
  'მდგომარეობა',
  'ვერსია %s: %s PHP-გაფართოება %s',
  'შესული ხართ როგორც: %s',
  'განახლება',
  'კოდირება',
  'ცხრილები',
  'ზომა',
  'გამოთვლა',
  'არჩეული',
  'წაშლა',
  'Loaded plugins',
  'screenshot',
  'მატერიალური ხედი',
  'ნახვა',
  'ცხრილი',
  'Inherits from',
  'ინდექსები',
  'ინდექსის შეცვლა',
  'წყარო',
  'სამიზნე',
  'შეცვლა',
  'გარე გასაღები დამატება',
  'Checks',
  'Create check',
  'ტრიგერები',
  'ტრიგერის დამატება',
  'Inherited by',
  'მუდმივი ბმული',
  'გამომავალი ინფორმაცია',
  'ფორმატი',
  'ინფორმაცია',
  'მომხმარებლის შექმან',
  'ATTACH-მოთხოვნები არაა მხარდაჭერილი.',
  'შეცდომა მოთხოვნაში',
  '%d / ',
  '%d რიგი',
  'მოთხოვდა შესრულდა, შეიცვალა %d ჩანაწერი.',
  'შესასრულებელი ბრძანება არაა.',
  '%d მოთხოვნა შესრულდა.',
  'შესრულება',
  'რიგების შეზღუდვა',
  'ფაილის ატვირთვა სერვერზე',
  'სერვერიდან',
  'ფაილი %s ვებსერვერზე',
  'ფაილის გაშვება',
  'გაჩერება შეცდომისას',
  'მხოლოდ შეცდომები',
  'ისტორია',
  'გასუფთავება',
  'ყველას შეცვლა',
  'ჩანაწერი წაიშალა.',
  'ჩანაწერი განახლდა.',
  'ჩანაწერი%s ჩაჯდა.',
  'ცხრილი წაიშალა.',
  'ცხრილი შეიცვალა.',
  'ცხრილი შეიქმნა.',
  'სახელი',
  'სახეობა',
  'სტანდარტული მნიშვნელობა',
  'წაიშალოს %s?',
  'დაყოფა',
  'დანაყოფები',
  'დანაყოფის სახელი',
  'პარამეტრები',
  'შეიცვალა ინდექსები.',
  'ინდექსის სახეობა',
  'Algorithm',
  'Columns',
  'სიგრძე',
  'სახელი',
  'Condition',
  'ბაზა წაიშალა.',
  'ბაზას გადაერქვა.',
  'ბაზა შეიქმნა.',
  'ბაზა შეიცვალა.',
  'გამოძახეება',
  'გამოძახებულია პროცედურა, შეიცვალა %d ჩანაწერი.',
  'გარე გასაღები წაიშალა.',
  'გარე გასაღები შეიცვალა.',
  'გარე გასაღები შეიქმნა.',
  'საწყისი და მიზნობრივი ველები უნდა იყოს ერთიდაიგივე სახეობის, მიზნობრივ ველზე უნდა იყოს ინდექსი და უნდა არსებობდეს შესაბამისი ინფორმაცია.',
  'გარე გასაღები',
  'მიზნობრივი ცხრილი',
  'შეცვლა',
  'ველის დამატება',
  'წარმოდგენა შეიცვალა.',
  'წარმოდგენა წაიშალა.',
  'წარმოდგენა შეიქმნა.',
  'წარმოდგენის შექმნა',
  'ღონისძიება წაიშალა.',
  'ღონისძიება შეიცვალა.',
  'ღონისძიება შეიქმნა.',
  'ღონისძიების შეცვლა',
  'ღონისძიების შექმნა',
  'დასაწყისი',
  'დასასრული',
  'ყოველ',
  'შენახვა დასრულებისას',
  'პროცედურა წაიშალა.',
  'პროცედურა შეიცვალა.',
  'პროცედურა შეიქმნა.',
  'ფუნქციის შეცვლა',
  'პროცედურის შეცვლა',
  'ფუნქციის შექმნა',
  'პროცედურის შექმნა',
  'დაბრუნების სახეობა',
  'Check has been dropped.',
  'Check has been altered.',
  'Check has been created.',
  'Alter check',
  'ტრიგერი წაიშალა.',
  'ტრიგერი შეიცვალა.',
  'ტრიგერი შეიქმნა.',
  'ტრიგერის შეცვლა',
  'ტრიგერის შექმნა',
  'დრო',
  'ღონისძიება',
  'მომხმარებელი წაიშალა.',
  'მომხმარებელი შეიცვალა.',
  'მომხმარებელი შეიქმნა.',
  'ჰეშირებული',
  'პროცედურა',
  'დაშვება',
  'შეზღუდვა',
  'გაითიშა %d პროცესი.',
  'კლონირება',
  'სულ %d',
  'დასრულება',
  'შეიცვალა %d ჩანაწერი.',
  'შესაცვლელად გამოიყენეთ Ctrl+თაგვის ღილაკი.',
  'ფაილი უნდა იყოს კოდირებაში UTF-8.',
  'დაიმპორტდა %d რიგი.',
  'ცხრილიდან ინფორმაცია ვერ მოვიპოვე',
  'შეცვლა',
  'ურთიერთობა',
  'რედაქტირება',
  'ამ მნიშვნელობის შესაცვლელად გამოიყენეთ ბმული «შეცვლა».',
  'მეტი ინფორმაციის ჩატვირთვა',
  'ჩატვირთვა',
  'გვერდი',
  'ბოლო',
  'სრული შედეგი',
  'ცხრილი გასუფთავდა.',
  'ცხრილი გადაადგილდა.',
  'ცხრილი დაკოპირდა.',
  'ცხრილები წაიშალა.',
  'ცხრილებს გაუკეთდა ოპტიმიზაცია.',
  'სქემა',
  'ცხრილები და წარმოდგენები',
  'ცხრილებში ძებნა',
  'ძრავი',
  'ინფორმაციის მოცულობა',
  'ინდექსების მოცულობა',
  'თავისუფალი სივრცე',
  'რიგი',
  'ვაკუუმი',
  'ოპტიმიზაცია',
  'შემოწმება',
  'ანალიზი',
  'გასწორება',
  'გასუფთავება',
  'გადატანა სხვა ბაზაში',
  'გადატანა',
  'კოპირება',
  'overwrite',
  'განრიგი',
  'მოცემულ დროში',
  'ბაზაში არაა მხარდაჭერილი პაროლი.',
];
		case "ko": return [
  '%.3f 초',
  '파일을 업로드 할 수 없습니다.',
  '파일의 최대 크기 %sB.',
  '파일이 존재하지 않습니다.',
  ',',
  '0123456789',
  'User types',
  '실행 하시겠습니까?',
  'Increase %s.',
  '파일 업로드가 잘못되었습니다.',
  '원본',
  '테이블이 없습니다.',
  '편집',
  '삽입',
  '행이 없습니다.',
  '이 테이블을 업데이트할 권한이 없습니다.',
  '저장',
  '저장하고 계속 편집하기',
  '저장하고 다음에 추가',
  'Saving',
  '삭제',
  '언어',
  '사용',
  'Unknown error.',
  '데이터베이스 형식',
  '서버',
  'hostname[:port] or :socket',
  '사용자이름',
  '비밀번호',
  '데이터베이스',
  '로그인',
  '영구적으로 로그인',
  'Adminer does not support accessing a database without a password, <a href="https://www.adminer.org/en/password/"%s>more information</a>.',
  '데이터를 선택하십시오',
  '구조 표시',
  '보기 변경',
  '테이블 변경',
  '항목 만들기',
  '경고',
  '%d 바이트',
  '열',
  '형',
  '주석',
  '자동 증가',
  'Default value',
  '선택',
  '함수',
  '집합',
  '검색',
  '모든',
  '정렬',
  '역순',
  '제약',
  '문자열의 길이',
  '실행',
  'Full table scan',
  'SQL 명령',
  '열',
  '저장',
  '데이터베이스 변경',
  '스키마 변경',
  '스키마 추가',
  '데이터베이스 구조',
  '권한',
  '루틴',
  '시퀀스',
  '이벤트',
  '가져 오기',
  '내보내기',
  '테이블 만들기',
  'DB',
  '선택',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  'Disable %s or enable %s or %s extensions.',
  '숫자',
  '시간',
  '문자열',
  '목록',
  '이진',
  '기하 형',
  'ltr',
  '오프라인입니다.',
  '로그아웃',
  'Too many unsuccessful logins, try again in %d minute(s).',
  '로그아웃을 성공했습니다.',
  'Thanks for using Adminer, consider <a href="https://www.adminer.org/en/donation/">donating</a>.',
  '세션이 만료되었습니다. 다시 로그인하십시오.',
  'Master password expired. <a href="https://www.adminer.org/en/extension/"%s>Implement</a> %s method to make it permanent.',
  '세션 지원을 사용해야만 합니다.',
  'The action will be performed after successful login with the same credentials.',
  '확장이 없습니다',
  'PHP 확장(%s)이 설치되어 있지 않습니다.',
  'Connecting to privileged ports is not allowed.',
  '잘못된 로그인.',
  'There is a space in the input password which might be the cause.',
  '잘못된 CSRF 토큰입니다. 다시 보내주십시오.',
  '정의 가능한 최대 필드 수를 초과했습니다. %s(을)를 늘리십시오.',
  'If you did not send this request from Adminer then close this page.',
  'POST 데이터가 너무 큽니다. 데이터 크기를 줄이거나 %s 설정을 늘리십시오.',
  '큰 SQL 파일은 FTP를 통하여 업로드하여 서버에서 가져올 수 있습니다.',
  '외부 키',
  '정렬',
  '업데이트할 때',
  '지울 때',
  '열 이름',
  '매개변수 이름',
  '길이',
  '설정',
  '다음 추가',
  '위로',
  '아래로',
  '제거',
  '잘못된 데이터베이스입니다.',
  '데이터베이스를 삭제했습니다.',
  '데이터베이스를 선택하십시오',
  '데이터베이스 만들기',
  '프로세스 목록',
  '변수',
  '상태',
  '%s 버전 %s, PHP 확장 %s',
  '다음으로 로그인했습니다: %s',
  '새로 고침',
  '정렬',
  '테이블',
  '크기',
  '계산하기',
  '선택됨',
  '삭제',
  'Loaded plugins',
  'screenshot',
  'Materialized view',
  '보기',
  '테이블',
  'Inherits from',
  '색인',
  '색인 변경',
  '소스',
  '타겟',
  '변경',
  '외부 키를 추가',
  'Checks',
  'Create check',
  '트리거',
  '트리거 추가',
  'Inherited by',
  '영구적으로 링크',
  '출력',
  '형식',
  '데이터',
  '사용자 만들기',
  'ATTACH queries are not supported.',
  '쿼리의 오류',
  '%d / ',
  '%d개 행',
  '쿼리를 잘 실행했습니다. %d행을 변경했습니다.',
  '실행할 수 있는 명령이 없습니다.',
  '%d개 쿼리를 잘 실행했습니다.',
  '실행',
  '행 제약',
  '파일 올리기',
  '서버에서 실행',
  '웹서버 파일 %s',
  '파일을 실행',
  '오류의 경우 중지',
  '오류 만 표시',
  '이력',
  '삭제',
  '모두 편집',
  '항목을 삭제했습니다.',
  '항목을 갱신했습니다.',
  '%s 항목을 삽입했습니다.',
  '테이블을 삭제했습니다.',
  '테이블을 변경했습니다.',
  '테이블을 만들었습니다.',
  '테이블 이름',
  '엔진',
  '기본값',
  'Drop %s?',
  '파티션',
  '파티션',
  '파티션 이름',
  '값',
  '색인을 변경했습니다.',
  '색인 형',
  'Algorithm',
  'Columns',
  '길이',
  '이름',
  'Condition',
  '데이터베이스를 삭제했습니다.',
  '데이터베이스의 이름을 바꾸었습니다.',
  '데이터베이스를 만들었습니다.',
  '데이터베이스를 변경했습니다.',
  '호출',
  '루틴을 호출했습니다. %d 행을 변경했습니다.',
  '외부 키를 제거했습니다.',
  '외부 키를 변경했습니다.',
  '외부 키를 만들었습니다.',
  '원본과 대상 열은 동일한 데이터 형식이어야만 합니다. 목표 열에 색인과 데이터가 존재해야만 합니다.',
  '외부 키',
  '테이블',
  '변경',
  '열 추가',
  '보기를 변경했습니다.',
  '보기를 삭제했습니다.',
  '보기를 만들었습니다.',
  '뷰 만들기',
  '삭제했습니다.',
  '변경했습니다.',
  '만들었습니다.',
  '이벤트 변경',
  '만들기',
  '시작',
  '종료',
  '매 번',
  '완성 후 저장',
  '루틴을 제거했습니다.',
  '루틴을 변경했습니다.',
  '루틴을 추가했습니다.',
  '함수 변경',
  '시저 변경',
  '함수 만들기',
  '시저 만들기',
  '반환 형식',
  'Check has been dropped.',
  'Check has been altered.',
  'Check has been created.',
  'Alter check',
  '트리거를 제거했습니다.',
  '트리거를 변경했습니다.',
  '트리거를 추가했습니다.',
  '트리거 변경',
  '트리거 만들기',
  '시간',
  '이벤트',
  '사용자를 제거했습니다.',
  '사용자를 변경했습니다.',
  '사용자를 만들었습니다.',
  'Hashed',
  '루틴',
  '권한 부여',
  '권한 취소',
  '%d개 프로세스를 강제 종료하였습니다.',
  '복제',
  '총 %d개',
  '강제 종료',
  '%d개 항목을 갱신했습니다.',
  'Ctrl+click on a value to modify it.',
  'File must be in UTF-8 encoding.',
  '%d개 행을 가져 왔습니다.',
  '테이블을 선택할 수 없습니다',
  '수정',
  '관계',
  '편집',
  '이 값을 수정하려면 편집 링크를 사용하십시오.',
  '더 많은 데이터 부르기',
  '부르는 중',
  '페이지',
  '마지막',
  '모든 결과',
  '테이블의 데이터 내용만 지웠습니다.',
  '테이블을 옮겼습니다.',
  '테이블을 복사했습니다.',
  '테이블을 삭제했습니다.',
  'Tables have been optimized.',
  '스키마',
  '테이블과 뷰',
  '테이블 내 데이터 검색',
  '엔진',
  '데이터 길이',
  '색인 길이',
  '데이터 여유',
  '행',
  '청소',
  '최적화',
  '확인',
  '분석',
  '복구',
  '데이터 내용만 지우기',
  '다른 데이터베이스로 이동',
  '이동',
  '복사',
  '덮어쓰기',
  '예약',
  '지정 시간',
  '네',
];
		case "lt": return [
  '%.3f s',
  'Nepavyko įkelti failo.',
  'Maksimalus failo dydis - %sB.',
  'Failas neegzistuoja.',
  ' ',
  '0123456789',
  'Vartotojų tipai',
  'Tikrai?',
  'Increase %s.',
  'Failų įkėlimas išjungtas.',
  'originalas',
  'Nėra lentelių.',
  'Redaguoti',
  'Įrašyti',
  'Nėra įrašų.',
  'You have no privileges to update this table.',
  'Išsaugoti',
  'Išsaugoti ir tęsti redagavimą',
  'Išsaugoti ir įrašyti kitą',
  'Saving',
  'Trinti',
  'Kalba',
  'Naudoti',
  'Unknown error.',
  'Sistema',
  'Serveris',
  'hostname[:port] or :socket',
  'Vartotojas',
  'Slaptažodis',
  'Duomenų bazė',
  'Prisijungti',
  'Pastovus prisijungimas',
  'Adminer does not support accessing a database without a password, <a href="https://www.adminer.org/en/password/"%s>more information</a>.',
  'Atrinkti duomenis',
  'Rodyti struktūrą',
  'Redaguoti vaizdą',
  'Redaguoti lentelę',
  'Naujas įrašas',
  'Warnings',
  [
    '%d baitas',
    '%d baigai',
    '%d baitų',
  ],
  'Stulpelis',
  'Tipas',
  'Komentaras',
  'Auto Increment',
  'Default value',
  'Atrinkti',
  'Funkcijos',
  'Agregacija',
  'Ieškoti',
  'visur',
  'Rikiuoti',
  'mažėjimo tvarka',
  'Limitas',
  'Teksto ilgis',
  'Veiksmas',
  'Full table scan',
  'SQL užklausa',
  'atidaryti',
  'išsaugoti',
  'Redaguoti duomenų bazę',
  'Keisti schemą',
  'Sukurti schemą',
  'Duomenų bazės schema',
  'Privilegijos',
  'Procedūros',
  'Sekos',
  'Įvykiai',
  'Importas',
  'Eksportas',
  'Sukurti lentelę',
  'DB',
  'atrinkti',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  'Disable %s or enable %s or %s extensions.',
  'Skaičiai',
  'Data ir laikas',
  'Tekstas',
  'Sąrašai',
  'Dvejetainis',
  'Geometrija',
  'ltr',
  'You are offline.',
  'Atsijungti',
  'Too many unsuccessful logins, try again in %d minute(s).',
  'Jūs atsijungėte nuo sistemos.',
  'Thanks for using Adminer, consider <a href="https://www.adminer.org/en/donation/">donating</a>.',
  'Sesijos galiojimas baigėsi. Prisijunkite iš naujo.',
  'Master password expired. <a href="https://www.adminer.org/en/extension/"%s>Implement</a> %s method to make it permanent.',
  'Sesijų palaikymas turi būti įjungtas.',
  'The action will be performed after successful login with the same credentials.',
  'Nėra plėtiio',
  'Nėra nei vieno iš palaikomų PHP plėtinių (%s).',
  'Connecting to privileged ports is not allowed.',
  'Neteisingi prisijungimo duomenys.',
  'There is a space in the input password which might be the cause.',
  'Neteisingas CSRF tokenas. Bandykite siųsti formos duomenis dar kartą.',
  'Viršytas maksimalus leidžiamų stulpelių kiekis. Padidinkite %s.',
  'If you did not send this request from Adminer then close this page.',
  'Per daug POST duomenų. Sumažinkite duomenų kiekį arba padidinkite konfigūracijos nustatymą %s.',
  'You can upload a big SQL file via FTP and import it from server.',
  'Išoriniai raktai',
  'palyginimas',
  'Atnaujinant',
  'Ištrinant',
  'Stulpelio pavadinimas',
  'Parametro pavadinimas',
  'Ilgis',
  'Nustatymai',
  'Pridėti kitą',
  'Perkelti į viršų',
  'Perkelti žemyn',
  'Pašalinti',
  'Neteisinga duomenų bazė.',
  'Duomenų bazės panaikintos.',
  'Pasirinkti duomenų bazę',
  'Sukurti duomenų bazę',
  'Procesų sąrašas',
  'Kintamieji',
  'Būsena',
  '%s versija: %s per PHP plėtinį %s',
  'Prisijungęs kaip: %s',
  'Atnaujinti',
  'Lyginimas',
  'Lentelės',
  'Size',
  'Compute',
  'Selected',
  'Pašalinti',
  'Loaded plugins',
  'screenshot',
  'Materialized view',
  'Vaizdas',
  'Lentelė',
  'Inherits from',
  'Indeksai',
  'Redaguoti indeksus',
  'Šaltinis',
  'Tikslas',
  'Redaguoti',
  'Pridėti išorinį raktą',
  'Checks',
  'Create check',
  'Trigeriai',
  'Pridėti trigerį',
  'Inherited by',
  'Pastovi nuoroda',
  'Išvestis',
  'Formatas',
  'Duomenys',
  'Sukurti vartotoją',
  'ATTACH queries are not supported.',
  'Klaida užklausoje',
  '%d / ',
  [
    '%d įrašas',
    '%d įrašai',
    '%d įrašų',
  ],
  [
    'Užklausa įvykdyta. Pakeistas %d įrašas.',
    'Užklausa įvykdyta. Pakeisti %d įrašai.',
    'Užklausa įvykdyta. Pakeista %d įrašų.',
  ],
  'Nėra vykdomų užklausų.',
  [
    '%d užklausa įvykdyta.',
    '%d užklausos įvykdytos.',
    '%d užklausų įvykdyta.',
  ],
  'Vykdyti',
  'Limit rows',
  'Failo įkėlimas',
  'Iš serverio',
  'Failas %s iš serverio',
  'Vykdyti failą',
  'Sustabdyti esant klaidai',
  'Rodyti tik klaidas',
  'Istorija',
  'Išvalyti',
  'Redaguoti visus',
  'Įrašas ištrintas.',
  'Įrašas pakeistas.',
  'Įrašas%s sukurtas.',
  'Lentelė pašalinta.',
  'Lentelė pakeista.',
  'Lentelė sukurta.',
  'Lentelės pavadinimas',
  'variklis',
  'Reikšmės pagal nutylėjimą',
  'Drop %s?',
  'Skirstyti pagal',
  'Skirsniai',
  'Skirsnio pavadinimas',
  'Reikšmės',
  'Indeksai pakeisti.',
  'Indekso tipas',
  'Algorithm',
  'Columns',
  'ilgis',
  'Pavadinimas',
  'Condition',
  'Duomenų bazė panaikinta.',
  'Duomenų bazė pervadinta.',
  'Duomenų bazė sukurta.',
  'Duomenų bazė pakeista.',
  'Vykdyti',
  [
    'Procedūra įvykdyta. %d įrašas pakeistas.',
    'Procedūra įvykdyta. %d įrašai pakeisti.',
    'Procedūra įvykdyta. %d įrašų pakeista.',
  ],
  'Išorinis raktas pašalintas.',
  'Išorinis raktas pakeistas.',
  'Išorinis raktas sukurtas.',
  'Šaltinio ir tikslinis stulpelis turi būti to paties tipo, tiksliniame stulpelyje turi būti naudojamas indeksas ir duomenys turi egzistuoti.',
  'Išorinis raktas',
  'Tikslinė lentelė',
  'Pakeisti',
  'Pridėti stulpelį',
  'Vaizdas pakeistas.',
  'Vaizdas pašalintas.',
  'Vaizdas sukurtas.',
  'Sukurti vaizdą',
  'Įvykis pašalintas.',
  'Įvykis pakeistas.',
  'Įvykis sukurtas.',
  'Redaguoti įvykį',
  'Sukurti įvykį',
  'Pradžia',
  'Pabaiga',
  'Kas',
  'Įvykdžius išsaugoti',
  'Procedūra pašalinta.',
  'Procedūra pakeista.',
  'Procedūra sukurta.',
  'Keisti funkciją',
  'Keiskti procedūrą',
  'Sukurti funkciją',
  'Sukurti procedūrą',
  'Grąžinimo tipas',
  'Check has been dropped.',
  'Check has been altered.',
  'Check has been created.',
  'Alter check',
  'Trigeris pašalintas.',
  'Trigeris pakeistas.',
  'Trigeris sukurtas.',
  'Keisti trigerį',
  'Sukurti trigerį',
  'Laikas',
  'Įvykis',
  'Vartotojas ištrintas.',
  'Vartotojo duomenys pakeisti.',
  'Vartotojas sukurtas.',
  'Šifruotas',
  'Procedūra',
  'Suteikti',
  'Atšaukti',
  [
    '%d procesas nutrauktas.',
    '%d procesai nutraukti.',
    '%d procesų nutraukta.',
  ],
  'Klonuoti',
  '%d iš viso',
  'Nutraukti',
  [
    'Pakeistas %d įrašas.',
    'Pakeisti %d įrašai.',
    'Pakeistas %d įrašų.',
  ],
  'Ctrl+click on a value to modify it.',
  'File must be in UTF-8 encoding.',
  [
    '%d įrašas įkelta.',
    '%d įrašai įkelti.',
    '%d įrašų įkelta.',
  ],
  'Neįmanoma atrinkti lentelės',
  'Modify',
  'Ryšiai',
  'redaguoti',
  'Norėdami redaguoti reikšmę naudokite redagavimo nuorodą.',
  'Load more data',
  'Loading',
  'Puslapis',
  'paskutinis',
  'Visas rezultatas',
  'Lentelės buvo ištuštintos.',
  'Lentelės perkeltos.',
  'Lentelės nukopijuotos.',
  'Lentelės pašalintos.',
  'Tables have been optimized.',
  'Schema',
  'Lentelės ir vaizdai',
  'Ieškoti duomenų lentelėse',
  'Variklis',
  'Duomenų ilgis',
  'Indekso ilgis',
  'Laisvos vietos',
  'Įrašai',
  'Vacuum',
  'Optimizuoti',
  'Patikrinti',
  'Analizuoti',
  'Pataisyti',
  'Tuštinti',
  'Perkelti į kitą duomenų bazę',
  'Perkelti',
  'Kopijuoti',
  'overwrite',
  'Grafikas',
  'Nurodytu laiku',
  'Keisti tipą',
];
		case "lv": return [
  '%.3f s',
  'Neizdevās ielādēt failu uz servera.',
  'Faila maksimālais izmērs — %sB.',
  'Fails neeksistē.',
  ' ',
  '0123456789',
  'Lietotāju tipi',
  'Vai Tu esi pārliecināts?',
  'Increase %s.',
  'Augšupielādes aizliegtas.',
  'oriģināls',
  'Datubāzē nav tabulu.',
  'Rediģēt',
  'Ievietot',
  'Nav rindu.',
  'jums nav pieejas labot šo tabulu.',
  'Saglabāt',
  'Saglabāt un turpināt rediģēt',
  'Saglabāt un ievietot nākamo',
  'Saglabāšana',
  'Dzēst',
  'Valoda',
  'Lietot',
  'Nezināma kļūda.',
  'Sistēma',
  'Serveris',
  'hostname[:port] or :socket',
  'Lietotājs',
  'Parole',
  'Datubāze',
  'Ieiet',
  'Atcerēties mani',
  'Adminer neatbalsta pieeju bez paroles, <a href="https://www.adminer.org/en/password/"%s>vairāk informācijas šeit</a>.',
  'Izvēlēties datus',
  'Parādīt struktūru',
  'Izmainīt skatu',
  'Mainīt tabulu',
  'Jauns ieraksts',
  'Brīdinājumi',
  [
    '%d baits',
    '%d baiti',
    '%d baiti',
  ],
  'Lauks',
  'Tips',
  'Komentārs',
  'Auto inkrements',
  'Noklusētā vērtība',
  'Izvēlēties',
  'Funkcijas',
  'Agregācija',
  'Meklēšana',
  'jebkurā vietā',
  'Kārtošana',
  'dilstoši',
  'Limits',
  'Teksta garums',
  'Darbība',
  'Pilna tabulas analīze',
  'SQL pieprasījums',
  'atvērt',
  'saglabāt',
  'Mainīt datubāzi',
  'Izmainīt shēmu',
  'Jauna shēma',
  'Datubāzes shēma',
  'Tiesības',
  'Procedūras un funkcijas',
  'Virknes',
  'Notikumi',
  'Imports',
  'Eksports',
  'Izveidot tabulu',
  'DB',
  'izvēlēties',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  'Disable %s or enable %s or %s extensions.',
  'Skaitļi',
  'Datums un laiks',
  'Virknes',
  'Saraksti',
  'Binārie',
  'Ģeometrija',
  'ltr',
  'Jūs est bezsasaistē.',
  'Iziet',
  [
    'Pieteikšanās mēģinājumu skaits par lielu. Mēginiet pēc %d minūtes.',
    'Pieteikšanās mēģinājumu skaits par lielu. Mēginiet pēc %d minūtēm.',
    'Pieteikšanās mēģinājumu skaits par lielu. Mēginiet pēc %d minūtēm.',
  ],
  'Jūs veiksmīgi izgājāt no sistēmas.',
  'Paldies, ka izmantoji Adminer, vai vēlies veikt <a href="https://www.adminer.org/en/donation/">ziedojumu</a>.',
  'Sesijas laiks ir beidzies, piesakies no jauna sistēmā.',
  'Master-parole nav derīga. <a href="https://www.adminer.org/en/extension/"%s>Implementējiet</a> metodi %s, lai padarīgu šo par ierastu metodi.',
  'Sesiju atbalstam jābūt ieslēgtam.',
  'Darbība tiks pabeigta pēc derīgas pieteikšanās sistēmā.',
  'Nav paplašinājuma',
  'Neviens PHP no atbalstītajiem paplašinājumiem (%s) nav pieejams.',
  'Pieeja priviliģētiem portiem nav atļauta.',
  'Nepareizs lietotāja vārds vai parole.',
  'Parole satur atstarpi, kas varētu būt lieka.',
  'Nederīgs CSRF žetons. Nosūtiet formu vēl vienu reizi.',
  'Sasniegts maksimālais lauku skaita ierobežojums. Palieliniet %s.',
  'Ja nesūtījāt šo pieprasījumu no Adminer, tad aizveriet pārlūka logu.',
  'POST metodes pieprasījums apjoms par lielu. Atsūtiet mazāka apjoma pieprasījumu kā konfigurācijas %s.',
  'Varat ielādēt lielu SQL failu uz servera un tad importēt to.',
  'Ārejā atslēgas',
  'Kolācija',
  'Pie atjaunošanas',
  'Pie dzēšanas',
  'Lauka nosaukums',
  'Parametra nosaukums',
  'Garums',
  'Opcijas',
  'Pievienot vēl',
  'Pārvietot uz augšu',
  'Pārvietot uz leju',
  'Noņemt',
  'Nederīga datubāze.',
  'Datubāzes dzēstas.',
  'Izvēlēties datubāzi',
  'Izveidot datubāzi',
  'Procesu saraksts',
  'Mainīgie',
  'Statuss',
  'Versija %s: %s ar PHP paplašinājumu %s',
  'Ielogojies kā: %s',
  'Atjaunot',
  'Kolācija',
  'Tabulas',
  'Izmērs',
  'Izskaitļot',
  'Izvēlētie',
  'Dzēst',
  'Loaded plugins',
  'screenshot',
  'Matrializēts skats',
  'Skats',
  'Tabula',
  'Inherits from',
  'Indeksi',
  'Izmainīt indeksus',
  'Avots',
  'Mērķis',
  'Izmainīt',
  'Pievienot ārējo atslēgu',
  'Checks',
  'Create check',
  'Trigeri',
  'Pievienot trigeri',
  'Inherited by',
  'Pastāvīga saite',
  'Izejas dati',
  'Formāts',
  'Dati',
  'Izveidot lietotāju',
  'ATTACH-pieprasījumi nav atbalstīti.',
  'Kļūda pieprasījumā',
  '%d / ',
  [
    '%d rinda',
    '%d rindas',
    '%d rindu',
  ],
  [
    'Pieprasījums pabeigts, izmainīts %d ieraksts.',
    'Pieprasījums pabeigts, izmainīti %d ieraksti.',
    'Pieprasījums pabeigts, izmainīti %d ieraksti.',
  ],
  'Nav izpildāmu komandu.',
  [
    '%d pieprasījums veiksmīgs.',
    '%d pieprasījumi veiksmīgi.',
    '%d pieprasījumi veiksmīgi.',
  ],
  'Izpidīt',
  'Rindu limits',
  'Augšupielāde',
  'No servera',
  'Fails %s uz servera',
  'Izpildīt failu',
  'Astāties kļūdas gadījumā',
  'Rādīt tikai kļūdas',
  'Vēsture',
  'Notīrīt',
  'Rediģēt visus',
  'Ieraksts dzests.',
  'Ieraksts atjaunots.',
  'Ieraksti%s tika ievietoti.',
  'Tabula dzēsta.',
  'Tabula mainīta.',
  'Tabula izveidota.',
  'Tabulas nosaukums',
  'Tabulas tips',
  'Noklusētā vērtība',
  'Dzēst %s?',
  'Sadalīt pēc',
  'Partīcijas',
  'Partīcijas nosaukums',
  'Vērtības',
  'Indeksi mainīti.',
  'Indeksa tips',
  'Algorithm',
  'Columns',
  'garums',
  'Nosaukums',
  'Condition',
  'Datubāze tika nodzēsta.',
  'Datubāze tika pārsaukta.',
  'Datubāze tika izveidota.',
  'Datubāze tika mainīta.',
  'Izsaukt',
  [
    'Procedūra izsaukta, izmainīts %d ieraksts.',
    'Procedūra izsaukta, izmainīti %d ieraksti.',
    'Procedūra izsaukta, izmainīti %d ieraksti.',
  ],
  'Ārejā atslēga dzēsta.',
  'Ārejā atslēga izmainīta.',
  'Ārejā atslēga izveidota.',
  'Lauku tipiem jābūt vienādiem, rezultējošā laukā jābut indeksa datiem.',
  'Ārejā atslēga',
  'Mērķa tabula',
  'Mainīt',
  'Pievienot lauku',
  'Skats izmainīts.',
  'Skats dzēsts.',
  'Skats izveidots.',
  'Izveidot skatu',
  'Notikums dzēsts.',
  'Notikums izmainīts.',
  'Notikums izveidots.',
  'Izmainīt notikumu',
  'Izveidot notikumu',
  'Sākums',
  'Beigas',
  'Katru',
  'Beigās saglabāt',
  'Procedūru dzēsta.',
  'Procedūru izmainīta.',
  'Procedūru izveidota.',
  'Mainīt funkciju',
  'Mainīt procedūru',
  'Izveidot funkciju',
  'Izveidot procedūru',
  'Atgriezt tips',
  'Check has been dropped.',
  'Check has been altered.',
  'Check has been created.',
  'Alter check',
  'Trigeris dzēsts.',
  'Trigeris izmainīts.',
  'Trigeris izveidots.',
  'Izmainīt trigeri',
  'Izveidot trigeri',
  'Laiks',
  'Notikums',
  'Lietotājs dzests.',
  'Lietotājs izmainīts.',
  'Lietotājs izveidots.',
  'Sajaukts',
  'Procedūra',
  'Atļaut',
  'Aizliegt',
  [
    'Pabeigts %d process.',
    'Pabeigti %d procesi.',
    'Pabeigti %d procesi.',
  ],
  'Klonēt',
  'Kopā %d',
  'Nobeigt',
  [
    'Izmainīts %d ieraksts.',
    'Izmainīti %d ieraksti.',
    'Izmainīti %d ieraksti.',
  ],
  'Lai izmainītu vērtību, izmanto Ctrl + peles klikšķi.',
  'Failam jābūt UTF-8 kodējumam.',
  [
    'Importēta %d rinda.',
    'Importētas %d rindas.',
    'Importētas %d rindas.',
  ],
  'Tabula nav pieejama',
  'Izmainīt',
  'Relācijas',
  'rediģēt',
  'Izmainīt vērtību var tikai ar saiti \'Izmainīt\'.',
  'Ielādēt vēl datus',
  'Ielāde',
  'Lapa',
  'pēdējā',
  'Viss rezultāts',
  'Tabulas iztīrītas.',
  'Tabulas pārvietotas.',
  'Tabulas nokopētas.',
  'Tabulas dzēstas.',
  'Tabulas optimizētas.',
  'Shēma',
  'Tabulas un skati',
  'Meklēt tabulās',
  'Dzinējs',
  'Datu apjoms',
  'Indeksu izmērs',
  'Brīvā vieta',
  'Rindas',
  'Vakums',
  'Optimizēt',
  'Pārbaudīt',
  'Analizēt',
  'Salabot',
  'Iztīrīt',
  'Pārvietot uz citu datubāzi',
  'Pārvietot',
  'kopēt',
  'pārrakstīt',
  'Grafiks',
  'Norāditā laikā',
  'Datubāze neatbalsta paroli.',
];
		case "ms": return [
  '%.3f s',
  'Muat naik fail gagal.',
  'Saiz fail maksimum yang dibenarkan adalah %sB.',
  'Fail tidak wujud.',
  ',',
  '0123456789',
  'Jenis pengguna',
  'Anda pasti?',
  'Increase %s.',
  'Muat naik fail dihalang.',
  'asli',
  'Tiada jadual.',
  'Ubah',
  'Masukkan',
  'Tiada baris.',
  'Anda tidak mempunyai keistimewaan untuk mengemaskini jadual ini.',
  'Simpan',
  'Simpan dan sambung ubah',
  'Simpan dan masukkan seterusnya',
  'Menyimpan',
  'Padam',
  'Bahasa',
  'Guna',
  'Unknown error.',
  'Sistem',
  'Pelayan',
  'hostname[:port] or :socket',
  'Nama pengguna',
  'Kata laluan',
  'Pangkalan data',
  'Log masuk',
  'Log masuk kekal',
  'Adminer does not support accessing a database without a password, <a href="https://www.adminer.org/en/password/"%s>more information</a>.',
  'Pilih data',
  'Paparkan struktur',
  'Ubah paparan',
  'Ubah jadual',
  'Item baru',
  'Warnings',
  [
    '%d byte',
    '%d bytes',
  ],
  'Kolum',
  'Jenis',
  'Komen',
  'Kenaikan Auto',
  'Nilai lalai',
  'Pilih',
  'Fungsi',
  'Pengagregatan',
  'Cari',
  'di mana-mana',
  'Susun',
  'menurun',
  'Had',
  'Kepanjangan teks',
  'Aksi',
  'Imbasan penuh jadual',
  'Arahan SQL',
  'buka',
  'simpan',
  'Ubah pangkalan data',
  'Ubah skema',
  'Buat skema',
  'Skema pangkalan data',
  'Keistimewaan',
  'Rutin',
  'Turutan',
  'Peristiwa',
  'Import',
  'Eksport',
  'Bina jadual',
  'DB',
  'pilih',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  'Disable %s or enable %s or %s extensions.',
  'Nombor',
  'Tarikh dan masa',
  'String',
  'Senarai',
  'Binari',
  'Geometri',
  'ltr',
  'Anda sedang offline.',
  'Log keluar',
  'Terlalu banyak percubaan log masuk yang gagal, sila cuba lagi dalam masa %d minit.',
  'Log keluar berjaya.',
  'Terima kasih kerana menggunakan Adminer, pertimbangkan untuk <a href="https://www.adminer.org/en/donation/">menderma</a>.',
  'Sesi telah luput, sila log masuk kembali.',
  'Kata laluan utama telah luput. <a href="https://www.adminer.org/en/extension/"%s>Gunakan</a> cara %s untuk mengekalkannya.',
  'Sokongan sesi perlu diaktifkan.',
  'The action will be performed after successful login with the same credentials.',
  'Tiada sambungan',
  'Sambungan PHP yang (%s) disokong tidak wujud.',
  'Penyambungan ke port yang istimewa tidak dibenarkan.',
  'Akses tidak sah.',
  'There is a space in the input password which might be the cause.',
  'Token CSRF tidak sah. Sila hantar borang sekali lagi.',
  'Bilangan medan telah melebihi had yang dibenarkan. Sila tingkatkan %s.',
  'Jika anda tidak menghantar permintaan ini dari Adminer sila tutup halaman ini.',
  'Data POST terlalu besar. Kecilkan data atau tingkatkan tetapan %s.',
  'Anda boleh muat naik fail SQL yang besar melalui FTP dan import melalui pelayan.',
  'Kunci asing',
  'collation',
  'ON UPDATE',
  'ON DELETE',
  'Nama kolum',
  'Nama pembolehubah',
  'Kepanjangan',
  'Pilihan',
  'Tambah yang seterusnya',
  'Gerak ke atas',
  'Gerak ke bawah',
  'Buang',
  'Pangkalan data tidak sah.',
  'Pangkalan data telah dijatuhkan.',
  'Pilih pangkalan data',
  'Bina pangkalan data',
  'Senarai proses',
  'Pembolehubah',
  'Status',
  'Versi %s: %s melalui sambungan PHP %s',
  'Log masuk sebagai: %s',
  'Segar kembali',
  'Collation',
  'Jadual',
  'Saiz',
  'Kira',
  'Terpilih',
  'Jatuh',
  'Loaded plugins',
  'screenshot',
  'Paparan yang menjadi kenyataan',
  'Papar',
  'Jadual',
  'Inherits from',
  'Indeks',
  'Ubah indeks',
  'Sumber',
  'Sasaran',
  'Ubah',
  'Tambah kunci asing',
  'Checks',
  'Create check',
  ' Pencetus',
  'Tambah pencetus',
  'Inherited by',
  'Pautan kekal',
  'Pengeluaran',
  'Format',
  'Data',
  'Bina pengguna',
  'Query berikut tidak disokong.',
  'Ralat pada query',
  '%d / ',
  '%d baris',
  'Query berjaya dilaksanakan, %d baris terjejas.',
  'Tiada arahan untuk dilaksanakan.',
  '%d query berjaya dilaksanakan.',
  'Laksana',
  'Had baris',
  'Muat naik fail',
  'Dari pelayan',
  'Fail pelayan sesawang %s',
  'Jalankan fail',
  'Berhenti jika ralat',
  'Paparkan jika ralat',
  'Sejarah',
  'Bersih',
  'Ubah semua',
  'Item telah dipadamkan.',
  'Item telah dikemaskini.',
  'Item%s telah dimasukkan.',
  'Jadual telah dijatuhkan.',
  'Jadual telah diubah.',
  'Jadual telah dibuat.',
  'Nama jadual',
  'enjin',
  'Nilai lalai',
  'Jatuhkan %s?',
  'Partition mengikut',
  'Partition',
  'Nama partition',
  'Nilai',
  'Indeks telah diubah.',
  'Jenis Indeks',
  'Algorithm',
  'Columns',
  'kepanjangan',
  'Nama',
  'Condition',
  'Pangkalan data telah dijatuhkan.',
  'Pangkalan data telah ditukar nama.',
  'Pangkalan data telah dibuat.',
  'Pangkalan data telah diubah.',
  'Panggil',
  'Rutin telah dipanggil, %d baris terjejas.',
  'Kunci asing telah dijatuhkan.',
  'Kunci asing telah diubah.',
  'Kunci asing telah dibuat.',
  'Kolum sumber dan sasaran perlu mempunyai jenis data yang sama, indeks diperlukan pada kolum sasaran dan data yang dirujuk wujud.',
  'Kunci asing',
  'Jadual sasaran',
  'Tukar',
  'Tambah kolum',
  'Paparan telah diubah.',
  'Paparan telah dijatuhkan.',
  'Paparan telah dibuat.',
  'Bina paparan',
  'Peristiwa telah dijatuhkan.',
  'Peristiwa telah diubah.',
  'Peristiwa telah dibuat.',
  'Ubah peristiwa',
  'Bina peristiwa',
  'Mula',
  'Habis',
  'Setiap',
  'Dalam melestarikan penyelesaian',
  'Rutin telah dijatuhkan.',
  'Rutin telah diubah.',
  'Rutin telah dibuat.',
  'Ubah fungsi',
  'Ubah prosedur',
  'Bina fungsi',
  'Bina prosedur',
  'Jenis Return',
  'Check has been dropped.',
  'Check has been altered.',
  'Check has been created.',
  'Alter check',
  'Pencetus telah dijatuhkan.',
  'Pencetus telah diubah.',
  'Pencetus telah dibuat.',
  'Ubah pencetus',
  'Buat pencetus',
  'Masa',
  'Peristiwa',
  'Pengguna telah dijatuhkan.',
  'Pengguna telah diubah.',
  'Pengguna telah dibuat.',
  'Hashed',
  'Rutin',
  'Beri',
  'Batal',
  '%d proses telah dihentikan.',
  'Klon',
  '%d secara keseluruhan',
  'Henti',
  '%d item telah terjejas.',
  'Ctrl+click pada nilai untuk meminda.',
  'Fail mesti dalam pengekodan UTF-8.',
  '%d baris telah diimport.',
  'Pemilihan jadual tidak berjaya',
  'Pinda',
  'Hubungan',
  'ubah',
  'Guna pautan ubah untuk meminda nilai ini.',
  'Load lebih data',
  'Loading',
  'Halaman',
  'akhir',
  'Keputusan keseluruhan',
  'Jadual telah dimangkaskan.',
  'Jadual telah dipindahkan.',
  'Jadual telah disalin.',
  'Jadual telah dijatuhkan.',
  'Jadual telah dioptimumkan.',
  'Skema',
  'Jadual dan pandangan',
  'Cari data dalam jadual',
  'Enjin',
  'Panjang Data',
  'Panjang Indeks',
  'Data Free',
  'Baris',
  'Vacuum',
  'Mengoptimum',
  'Periksa',
  'Menganalisis',
  'Baiki',
  'Memangkas',
  'Pindahkan ke pangkalan data yang lain',
  'Pindah',
  'Salin',
  'overwrite',
  'Jadual',
  'Pada masa tersebut',
  'Ubah jenis',
];
		case "nl": return [
  '%.3f s',
  'Onmogelijk bestand te uploaden.',
  'Maximum toegelaten bestandsgrootte is %sB.',
  'Bestand niet gevonden.',
  '.',
  '0123456789',
  'Gebruikersgedefiniëerde types',
  'Weet u het zeker?',
  'Increase %s.',
  'Bestanden uploaden is uitgeschakeld.',
  'origineel',
  'Geen tabellen.',
  'Bewerk',
  'Toevoegen',
  'Geen rijen.',
  'U bent niet gemachtigd om deze tabel aan te passen.',
  'Opslaan',
  'Opslaan en verder bewerken',
  'Opslaan en volgende toevoegen',
  'Opslaan',
  'Verwijderen',
  'Taal',
  'Gebruik',
  'Onbekende fout.',
  'Databasesysteem',
  'Server',
  'hostname[:port] or :socket',
  'Gebruikersnaam',
  'Wachtwoord',
  'Database',
  'Aanmelden',
  'Blijf aangemeld',
  'Adminer ondersteunt geen toegang tot databases zonder wachtwoord, <a href="https://www.adminer.org/en/password/"%s>meer informatie</a>.',
  'Gegevens selecteren',
  'Toon structuur',
  'View aanpassen',
  'Tabel aanpassen',
  'Nieuw item',
  'Waarschuwingen',
  [
    '%d byte',
    '%d bytes',
  ],
  'Kolom',
  'Type',
  'Commentaar',
  'Auto nummering',
  'Standaardwaarde',
  'Kies',
  'Functies',
  'Totalen',
  'Zoeken',
  'overal',
  'Sorteren',
  'Aflopend',
  'Beperk',
  'Tekst lengte',
  'Acties',
  'Full table scan',
  'SQL opdracht',
  'openen',
  'opslaan',
  'Database aanpassen',
  'Schema wijzigen',
  'Schema maken',
  'Database schema',
  'Rechten',
  'Procedures',
  'Sequences',
  'Events',
  'Importeren',
  'Exporteren',
  'Tabel aanmaken',
  'DB',
  'kies',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  'Schakel %s uit or schakel extensies %s of %s in.',
  'Getallen',
  'Datum en tijd',
  'Tekst',
  'Lijsten',
  'Binaire gegevens',
  'Geometrie',
  'ltr',
  'U bent offline.',
  'Afmelden',
  [
    'Teveel foutieve aanmeldpogingen, probeer opnieuw binnen %d minuut.',
    'Teveel foutieve aanmeldpogingen, probeer opnieuw binnen %d minuten.',
  ],
  'Successvol afgemeld.',
  'Thanks for using Adminer, consider <a href="https://www.adminer.org/en/donation/">donating</a>.',
  'Uw sessie is verlopen. Gelieve opnieuw aan te melden.',
  'Master wachtwoord verlopen. <a href="https://www.adminer.org/en/extension/"%s>Implementeer</a> de %s methode om het permanent te maken.',
  'Sessies moeten geactiveerd zijn.',
  'Deze actie zal uitgevoerd worden na het succesvol aanmelden met dezelfde gebruikersgegevens.',
  'Geen extensie',
  'Geen geldige PHP extensies beschikbaar (%s).',
  'Verbindingen naar geprivilegieerde poorten is niet toegestaan.',
  'Ongeldige gebruikersgegevens.',
  'Er staat een spatie in het wachtwoord, wat misschien de oorzaak is.',
  'Ongeldig CSRF token. Verstuur het formulier opnieuw.',
  'Maximum aantal velden bereikt. Verhoog %s.',
  'Als u deze actie niet via Adminer hebt gedaan, gelieve deze pagina dan te sluiten.',
  'POST-data is te groot. Verklein de hoeveelheid data of verhoog de %s configuratie.',
  'U kan een groot SQL-bestand uploaden via FTP en het importeren via de server.',
  'Foreign keys',
  'collation',
  'ON UPDATE',
  'ON DELETE',
  'Kolomnaam',
  'Parameternaam',
  'Lengte',
  'Opties',
  'Volgende toevoegen',
  'Omhoog',
  'Omlaag',
  'Verwijderen',
  'Ongeldige database.',
  'Databases verwijderd.',
  'Database selecteren',
  'Database aanmaken',
  'Proceslijst',
  'Variabelen',
  'Status',
  '%s versie: %s met PHP extensie %s',
  'Aangemeld als: %s',
  'Vernieuwen',
  'Collatie',
  'Tabellen',
  'Grootte',
  'Bereken',
  'Geselecteerd',
  'Verwijderen',
  'Loaded plugins',
  'screenshot',
  'Materialized view',
  'View',
  'Tabel',
  'Inherits from',
  'Indexen',
  'Indexen aanpassen',
  'Bron',
  'Doel',
  'Aanpassen',
  'Foreign key aanmaken',
  'Checks',
  'Create check',
  'Triggers',
  'Trigger aanmaken',
  'Inherited by',
  'Permanente link',
  'Uitvoer',
  'Formaat',
  'Data',
  'Gebruiker aanmaken',
  'ATTACH queries worden niet ondersteund.',
  'Fout in query',
  '%d / ',
  [
    '%d rij',
    '%d rijen',
  ],
  [
    'Query uitgevoerd, %d rij aangepast.',
    'Query uitgevoerd, %d rijen aangepast.',
  ],
  'Geen opdrachten uit te voeren.',
  [
    '%d query succesvol uitgevoerd.',
    '%d querys succesvol uitgevoerd.',
  ],
  'Uitvoeren',
  'Rijen beperken',
  'Bestand uploaden',
  'Van server',
  'Webserver bestand %s',
  'Bestand uitvoeren',
  'Stoppen bij fout',
  'Enkel fouten tonen',
  'Geschiedenis',
  'Wissen',
  'Alles bewerken',
  'Item verwijderd.',
  'Item aangepast.',
  'Item%s toegevoegd.',
  'Tabel verwijderd.',
  'Tabel aangepast.',
  'Tabel aangemaakt.',
  'Tabelnaam',
  'engine',
  'Standaard waarden',
  'Verwijder %s?',
  'Partitioneren op',
  'Partities',
  'Partitie naam',
  'Waarden',
  'Index aangepast.',
  'Index type',
  'Algorithm',
  'Columns',
  'lengte',
  'Naam',
  'Condition',
  'Database verwijderd.',
  'Database hernoemd.',
  'Database aangemaakt.',
  'Database aangepast.',
  'Uitvoeren',
  [
    'Procedure uitgevoerd, %d rij geraakt.',
    'Procedure uitgevoerd, %d rijen geraakt.',
  ],
  'Foreign key verwijderd.',
  'Foreign key aangepast.',
  'Foreign key aangemaakt.',
  'Bron- en doelkolommen moeten van hetzelfde data type zijn, er moet een index bestaan op de gekozen kolommen en er moet gerelateerde data bestaan.',
  'Foreign key',
  'Doeltabel',
  'Veranderen',
  'Kolom toevoegen',
  'View aangepast.',
  'View verwijderd.',
  'View aangemaakt.',
  'View aanmaken',
  'Event werd verwijderd.',
  'Event werd aangepast.',
  'Event werd aangemaakt.',
  'Event aanpassen',
  'Event aanmaken',
  'Start',
  'Stop',
  'Iedere',
  'Bewaren na voltooiing',
  'Procedure verwijderd.',
  'Procedure aangepast.',
  'Procedure aangemaakt.',
  'Functie aanpassen',
  'Procedure aanpassen',
  'Functie aanmaken',
  'Procedure aanmaken',
  'Return type',
  'Check has been dropped.',
  'Check has been altered.',
  'Check has been created.',
  'Alter check',
  'Trigger verwijderd.',
  'Trigger aangepast.',
  'Trigger aangemaakt.',
  'Trigger aanpassen',
  'Trigger aanmaken',
  'Time',
  'Event',
  'Gebruiker verwijderd.',
  'Gebruiker aangepast.',
  'Gebruiker aangemaakt.',
  'Gehashed',
  'Routine',
  'Toekennen',
  'Intrekken',
  [
    '%d proces gestopt.',
    '%d processen gestopt.',
  ],
  'Dupliceer',
  '%d in totaal',
  'Stoppen',
  [
    '%d item aangepast.',
    '%d items aangepast.',
  ],
  'Ctrl+klik op een waarde om deze te bewerken.',
  'Het bestand moet met UTF-8 encodering zijn opgeslagen.',
  [
    '%d rij werd geïmporteerd.',
    '%d rijen werden geïmporteerd.',
  ],
  'Onmogelijk tabel te selecteren',
  'Aanpassen',
  'Relaties',
  'bewerk',
  'Gebruik de link \'bewerk\' om deze waarde te wijzigen.',
  'Meer data inladen',
  'Aan het laden',
  'Pagina',
  'laatste',
  'Volledig resultaat',
  'Tabellen werden geleegd.',
  'Tabellen werden verplaatst.',
  'De tabellen zijn gekopieerd.',
  'Tabellen werden verwijderd.',
  'Tabellen zijn geoptimaliseerd.',
  'Schema',
  'Tabellen en views',
  'Zoeken in database',
  'Engine',
  'Data lengte',
  'Index lengte',
  'Data Vrij',
  'Rijen',
  'Vacuum',
  'Optimaliseer',
  'Controleer',
  'Analyseer',
  'Herstel',
  'Legen',
  'Verplaats naar andere database',
  'Verplaats',
  'Kopieren',
  'overschrijven',
  'Schedule',
  'Op aangegeven tijd',
  'neen',
];
		case "no": return [
  '%.3f s',
  'Kunne ikke laste opp fil.',
  'Maksimum tillatte filstørrelse er %sB.',
  'Filen eksisterer ikke.',
  ' ',
  '0123456789',
  'Brukertyper',
  'Er du sikker?',
  'Increase %s.',
  'Filopplastinger ikke tillatt.',
  'original',
  'Ingen tabeller.',
  'Rediger',
  'Sett inn',
  'Ingen rader.',
  'Du mangler rettighetene som trengs for å endre denne tabellen.',
  'Lagre',
  'Lagre og fortsett å redigere',
  'Lagre og sett inn neste',
  'Lagrer',
  'Slett',
  'Språk',
  'Bruk',
  'Unknown error.',
  'System',
  'Server',
  'hostname[:port] or :socket',
  'Brukernavn',
  'Passord',
  'Database',
  'Logg inn',
  'Permanent login',
  'Adminer does not support accessing a database without a password, <a href="https://www.adminer.org/en/password/"%s>more information</a>.',
  'Velg data',
  'Vis struktur',
  'Endre view',
  'Endre tabell',
  'Ny rad',
  'Warnings',
  [
    '%d byte',
    '%d bytes',
  ],
  'Kolonne',
  'Type',
  'Kommentarer',
  'Autoinkrement',
  'Default value',
  'Velg',
  'Funksjoner',
  'Sammenfatning',
  'Søk',
  'hvorsomhelst',
  'Sorter',
  'minkende',
  'Skranke',
  'Tekstlengde',
  'Handling',
  'Full tabell-scan',
  'SQL-kommando',
  'åpne',
  'lagre',
  'Endre database',
  'Endre skjema',
  'Opprett skjema',
  'Databaseskjema',
  'Privilegier',
  'Rutiner',
  'Sekvenser',
  'Eventer',
  'Importer',
  'Eksport',
  'Opprett tabell',
  'DB',
  'Vis',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  'Disable %s or enable %s or %s extensions.',
  'Nummer',
  'Dato og tid',
  'Strenger',
  'Lister',
  'Binære',
  'Geometri',
  'venstre-til-høyre',
  'You are offline.',
  'Logg ut',
  'Too many unsuccessful logins, try again in %d minute(s).',
  'Utlogging vellykket.',
  'Thanks for using Adminer, consider <a href="https://www.adminer.org/en/donation/">donating</a>.',
  'Økt utløpt - vennligst logg inn på nytt.',
  'Master-passord er utløpt. <a href="https://www.adminer.org/en/extension/"%s>Implementer</a> en metode for %s for å gjøre det permanent.',
  'Økt-støtte må være skrudd på.',
  'The action will be performed after successful login with the same credentials.',
  'Ingen utvidelse',
  'Ingen av de støttede PHP-utvidelsene (%s) er tilgjengelige.',
  'Connecting to privileged ports is not allowed.',
  'Ugylding innloggingsinformasjon.',
  'There is a space in the input password which might be the cause.',
  'Ugylding CSRF-token - Send inn skjemaet igjen.',
  'Maksimum antall feltnavn overskredet - venligst øk %s.',
  'If you did not send this request from Adminer then close this page.',
  'For stor datamengde i skjemaet. Reduser datamengden, eller øk størrelsen på %s-konfigurasjonsdirektivet.',
  'Du kan laste opp en stor SQL-fil via FTP og importere den fra serveren.',
  'Fremmednøkler',
  'sortering',
  'ON UPDATE',
  'ON DELETE',
  'Kolonnenavn',
  'Parameternavn',
  'Lengde',
  'Valg',
  'Legg til neste',
  'Flytt opp',
  'Flytt ned',
  'Fjern',
  'Ugyldig database.',
  'Databasene har blitt slettet.',
  'Velg database',
  'Opprett database',
  'Prosessliste',
  'Variabler',
  'Status',
  '%s versjon: %s via PHP-utvidelse %s',
  'Logget inn som: %s',
  'Gjenoppfrisk',
  'Tekstsortering',
  'Tabeller',
  'Size',
  'Compute',
  'Valgt',
  'Dropp',
  'Loaded plugins',
  'screenshot',
  'Materialized view',
  'View',
  'Tabell',
  'Inherits from',
  'Indekser',
  'Endre indekser',
  'Kilde',
  'Mål',
  'Endre',
  'Legg til fremmednøkkel',
  'Checks',
  'Create check',
  'Triggere',
  'Legg til trigger',
  'Inherited by',
  'Permanent lenke',
  'Resultat',
  'Format',
  'Data',
  'Lag bruker',
  'ATTACH queries are not supported.',
  'Feil i forespørsel',
  '%d / ',
  [
    '%d rad',
    '%d rader',
  ],
  [
    'Kall utført OK, %d rad påvirket.',
    'Kall utført OK, %d rader påvirket.',
  ],
  'Ingen kommandoer å utføre.',
  [
    '%d kall utført OK.',
    '%d kall utført OK.',
  ],
  'Kjør',
  'Limit rows',
  'Filopplasting',
  'Fra server',
  'Webserver-fil %s',
  'Kjør fil',
  'Stopp ved feil',
  'Vis bare feil',
  'Historie',
  'Tøm skjema',
  'Rediger alle',
  'Raden er slettet.',
  'Raden er oppdatert.',
  'Rad%s er satt inn.',
  'Tabellen er slettet.',
  'Tabellen er endret.',
  'Tabellen er opprettet.',
  'Tabellnavn',
  'mottor',
  'Standardverdier',
  'Drop %s?',
  'Partisjoner ved',
  'Partisjoner',
  'Partisjonsnavn',
  'Verdier',
  'Indeksene er endret.',
  'Indekstype',
  'Algorithm',
  'Columns',
  'lengde',
  'Navn',
  'Condition',
  'Databasen har blitt slettet.',
  'Databasen har fått nytt navn.',
  'Databasen er opprettet.',
  'Databasen er endret.',
  'Kall',
  [
    'Rutinen er utført, %d rad påvirket.',
    'Rutinen er utført, %d rader påvirket.',
  ],
  'Fremmednøkkelen er slettet.',
  'Fremmednøkkelen er endret.',
  'Fremmednøkkelen er opprettet.',
  'Kilde- og mål-kolonner må ha samme datatype, det må være en indeks på mål-kolonnen, og dataene som refereres til må eksistere.',
  'Fremmednøkkel',
  'Måltabell',
  'Endre',
  'Legg til kolonne',
  'Viewet er endret.',
  'Viewet er slettet.',
  'Viewet er opprettet.',
  'Lag nytt view',
  'Eventen er slettet.',
  'Eventen er endret.',
  'Eventen er opprettet.',
  'Endre event',
  'Opprett event',
  'Start',
  'Slutt',
  'Hver',
  'Ved fullførelse bevar',
  'Rutinen er slettet.',
  'Rutinen er endret.',
  'Rutinen er opprettet.',
  'Endre funksjon',
  'Endre prosedyre',
  'Opprett funksjon',
  'Opprett prosedyre',
  'Returtype',
  'Check has been dropped.',
  'Check has been altered.',
  'Check has been created.',
  'Alter check',
  'Triggeren er slettet.',
  'Triggeren er endret.',
  'Triggeren er opprettet.',
  'Endre trigger',
  'Opprett trigger',
  'Tid',
  'Hendelse',
  'Bruker slettet.',
  'Bruker endret.',
  'Bruker opprettet.',
  'Hashet',
  'Rutine',
  'Gi privilegier',
  'Trekk tilbake',
  [
    '%d prosess avsluttet.',
    '%d prosesser avsluttet.',
  ],
  'Klon',
  '%d totalt',
  'Avslutt',
  [
    '%d rad påvirket.',
    '%d rader påvirket.',
  ],
  'Ctrl+klikk på en verdi for å endre den.',
  'Filen må være i UTF8-tegnkoding.',
  [
    '%d rad er importert.',
    '%d rader er importert.',
  ],
  'Kan ikke velge tabellen',
  'Endre',
  'Relasjoner',
  'rediger',
  'Bruk rediger-lengde for å endre dennne verdien.',
  'Last mer data',
  'Laster',
  'Side',
  'siste',
  'Hele resultatet',
  'Tabellene har blitt avkortet.',
  'Tabellene har blitt flyttet.',
  'Tabellene har blitt kopiert.',
  'Tabellene er slettet.',
  'Tabellene er blitt optimalisert.',
  'Skjema',
  'Tabeller og views',
  'Søk data i tabeller',
  'Motor',
  'Datalengde',
  'Indekslengde',
  'Frie data',
  'Rader',
  'Støvsug',
  'Optimaliser',
  'Sjekk',
  'Analyser',
  'Reparer',
  'Avkort',
  'Flytt til annen database',
  'Flytt',
  'Kopier',
  'overwrite',
  'Tidsplan',
  'På gitte tid',
  'Endre type',
];
		case "pl": return [
  '%.3f s',
  'Wgranie pliku było niemożliwe.',
  'Maksymalna wielkość pliku to %sB.',
  'Plik nie istnieje.',
  ' ',
  '0123456789',
  'Typy użytkownika',
  'Czy na pewno?',
  'Zwiększ %s.',
  'Wgrywanie plików jest wyłączone.',
  'bez zmian',
  'Brak tabel.',
  'Edytuj',
  'Dodaj',
  'Brak rekordów.',
  'Brak uprawnień do edycji tej tabeli.',
  'Zapisz zmiany',
  'Zapisz i kontynuuj edycję',
  'Zapisz i dodaj następny',
  'Zapisywanie',
  'Usuń',
  'Język',
  'Wybierz',
  'Nieznany błąd.',
  'Rodzaj bazy',
  'Serwer',
  'hostname[:port] or :socket',
  'Użytkownik',
  'Hasło',
  'Baza danych',
  'Zaloguj się',
  'Zapamiętaj sesję',
  'Adminer nie obsługuje dostępu do bazy danych bez hasła, <a href="https://www.adminer.org/pl/password/"%s>więcej informacji</a>.',
  'Pokaż dane',
  'Struktura tabeli',
  'Zmień perspektywę',
  'Zmień tabelę',
  'Nowy rekord',
  'Ostrzeżenia',
  [
    '%d bajt',
    '%d bajty',
    '%d bajtów',
  ],
  'Kolumna',
  'Typ',
  'Komentarz',
  'Automatyczny przyrost',
  'Wartość domyślna',
  'pokaż',
  'Funkcje',
  'Agregacje',
  'Szukaj',
  'gdziekolwiek',
  'Sortuj',
  'malejąco',
  'Limit',
  'Długość tekstu',
  'Czynność',
  'Wymaga pełnego przeskanowania tabeli',
  'Zapytanie SQL',
  'otwórz',
  'zapisz',
  'Zmień bazę danych',
  'Zmień schemat',
  'Utwórz schemat',
  'Schemat bazy danych',
  'Uprawnienia użytkowników',
  'Procedury i funkcje',
  'Sekwencje',
  'Wydarzenia',
  'Importuj',
  'Eksportuj',
  'Utwórz tabelę',
  'BD',
  'przeglądaj',
  '%s musi <a%s>zwrócić tablicę</a>.',
  '<a%s>Skonfiguruj</a> %s w %s.',
  'Wyłącz %s lub włącz rozszerzenia %s lub %s.',
  'Numeryczne',
  'Data i czas',
  'Tekstowe',
  'Listy',
  'Binarne',
  'Geometria',
  'ltr',
  'Jesteś offline.',
  'Wyloguj się',
  [
    'Za dużo nieudanych prób logowania, spróbuj ponownie za %d minutę.',
    'Za dużo nieudanych prób logowania, spróbuj ponownie za %d minuty.',
    'Za dużo nieudanych prób logowania, spróbuj ponownie za %d minut.',
  ],
  'Wylogowano pomyślnie.',
  'Dziękujemy za używanie Adminera, rozważ <a href="https://www.adminer.org/pl/donation/">dotację</a>.',
  'Sesja wygasła, zaloguj się ponownie.',
  'Ważność hasła głównego wygasła. <a href="https://www.adminer.org/pl/extension/"%s>Zaimplementuj</a> własną metodę %s, aby ustawić je na stałe.',
  'Wymagana jest obsługa sesji w PHP.',
  'Czynność zostanie wykonana po pomyślnym zalogowaniu przy użyciu tych samych danych logowania.',
  'Brak rozszerzenia',
  'Żadne z rozszerzeń PHP umożliwiających połączenie się z bazą danych (%s) nie jest dostępne.',
  'Łączenie do portów uprzywilejowanych jest niedozwolone.',
  'Nieprawidłowe dane logowania.',
  'W haśle wejściowym znajduje się spacja, która może być przyczyną.',
  'Nieprawidłowy token CSRF. Spróbuj wysłać formularz ponownie.',
  'Przekroczono maksymalną liczbę pól. Zwiększ %s.',
  'Jeżeli nie wywołałeś tej strony z Adminera, zamknij to okno.',
  'Przesłano zbyt dużo danych. Zmniejsz objętość danych lub zwiększ zmienną konfiguracyjną %s.',
  'Większe pliki SQL możesz wgrać na serwer poprzez FTP przed zaimportowaniem.',
  'Klucze obce',
  'porównywanie znaków',
  'W przypadku zmiany',
  'W przypadku usunięcia',
  'Nazwa kolumny',
  'Nazwa parametru',
  'Długość',
  'Opcje',
  'Dodaj następny',
  'Przesuń w górę',
  'Przesuń w dół',
  'Usuń',
  'Nie znaleziono bazy danych.',
  'Bazy danych zostały usunięte.',
  'Wybierz bazę danych',
  'Utwórz bazę danych',
  'Lista procesów',
  'Zmienne',
  'Status',
  'Wersja %s: %s za pomocą %s',
  'Zalogowany jako: %s',
  'Odśwież',
  'Porównywanie znaków',
  'Tabele',
  'Rozmiar',
  'Oblicz',
  'Zaznaczone',
  'Usuń',
  'Wczytane wtyczki',
  'zrzut ekranu',
  'Zmaterializowana perspektywa',
  'Perspektywa',
  'Tabela',
  'Dziedziczy po',
  'Indeksy',
  'Zmień indeksy',
  'Źródło',
  'Cel',
  'Zmień',
  'Dodaj klucz obcy',
  'Kontrole',
  'Utwórz kontrolę',
  'Wyzwalacze',
  'Dodaj wyzwalacz',
  'Odziedziczone przez',
  'Trwały link',
  'Rezultat',
  'Format',
  'Dane',
  'Dodaj użytkownika',
  'Zapytania ATTACH są niewspierane.',
  'Błąd w zapytaniu',
  '%d / ',
  [
    '%d rekord',
    '%d rekordy',
    '%d rekordów',
  ],
  [
    'Zapytanie wykonane pomyślnie, zmieniono %d rekord.',
    'Zapytanie wykonane pomyślnie, zmieniono %d rekordy.',
    'Zapytanie wykonane pomyślnie, zmieniono %d rekordów.',
  ],
  'Nic do wykonania.',
  [
    'Pomyślnie wykonano %d zapytanie.',
    'Pomyślnie wykonano %d zapytania.',
    'Pomyślnie wykonano %d zapytań.',
  ],
  'Wykonaj',
  'Limit rekordów',
  'Wgranie pliku',
  'Z serwera',
  'Plik %s na serwerze',
  'Uruchom z pliku',
  'Zatrzymaj w przypadku błędu',
  'Pokaż tylko błędy',
  'Historia',
  'Wyczyść',
  'Edytuj wszystkie',
  'Rekord został usunięty.',
  'Rekord został zaktualizowany.',
  'Rekord%s został dodany.',
  'Tabela została usunięta.',
  'Tabela została zmieniona.',
  'Tabela została utworzona.',
  'Nazwa tabeli',
  'składowanie',
  'Wartości domyślne',
  'Usunąć %s?',
  'Partycjonowanie',
  'Partycje',
  'Nazwa partycji',
  'Wartości',
  'Indeksy zostały zmienione.',
  'Typ indeksu',
  'Algorytm',
  'Kolumny',
  'długość',
  'Nazwa',
  'Warunek',
  'Baza danych została usunięta.',
  'Nazwa bazy danych została zmieniona.',
  'Baza danych została utworzona.',
  'Baza danych została zmieniona.',
  'Uruchom',
  [
    'Procedura została uruchomiona, zmieniono %d rekord.',
    'Procedura została uruchomiona, zmieniono %d rekordy.',
    'Procedura została uruchomiona, zmieniono %d rekordów.',
  ],
  'Klucz obcy został usunięty.',
  'Klucz obcy został zmieniony.',
  'Klucz obcy został utworzony.',
  'Źródłowa i docelowa kolumna muszą być tego samego typu, powinien istnieć indeks na docelowej kolumnie oraz muszą istnieć dane referencyjne.',
  'Klucz obcy',
  'Tabela docelowa',
  'Zmień',
  'Dodaj kolumnę',
  'Perspektywa została zmieniona.',
  'Perspektywa została usunięta.',
  'Perspektywa została utworzona.',
  'Utwórz perspektywę',
  'Wydarzenie zostało usunięte.',
  'Wydarzenie zostało zmienione.',
  'Wydarzenie zostało utworzone.',
  'Zmień wydarzenie',
  'Utwórz wydarzenie',
  'Początek',
  'Koniec',
  'Wykonuj co',
  'Nie kasuj wydarzenia po przeterminowaniu',
  'Procedura została usunięta.',
  'Procedura została zmieniona.',
  'Procedura została utworzona.',
  'Zmień funkcję',
  'Zmień procedurę',
  'Utwórz funkcję',
  'Utwórz procedurę',
  'Zwracany typ',
  'Kontrola została usunięta.',
  'Kontrola została zmieniona.',
  'Kontrola została utworzona.',
  'Zmień kontrolę',
  'Wyzwalacz został usunięty.',
  'Wyzwalacz został zmieniony.',
  'Wyzwalacz został utworzony.',
  'Zmień wyzwalacz',
  'Utwórz wyzwalacz',
  'Czas',
  'Wydarzenie',
  'Użytkownik został usunięty.',
  'Użytkownik został zmieniony.',
  'Użytkownik został dodany.',
  'Zahashowane',
  'Procedura',
  'Uprawnienia',
  'Usuń uprawnienia',
  [
    'Przerwano %d wątek.',
    'Przerwano %d wątki.',
    'Przerwano %d wątków.',
  ],
  'Duplikuj',
  '%d w sumie',
  'Przerwij wykonywanie',
  [
    'Zmieniono %d rekord.',
    'Zmieniono %d rekordy.',
    'Zmieniono %d rekordów.',
  ],
  'Ctrl+kliknij wartość, aby ją edytować.',
  'Kodowanie pliku musi być ustawione na UTF-8.',
  [
    '%d rekord został zaimportowany.',
    '%d rekordy zostały zaimportowane.',
    '%d rekordów zostało zaimportowanych.',
  ],
  'Nie udało się pobrać danych z tabeli',
  'Zmień',
  'Relacje',
  'edytuj',
  'Użyj linku edycji, aby zmienić tę wartość.',
  'Wczytaj więcej danych',
  'Wczytywanie',
  'Strona',
  'ostatni',
  'Wybierz wszystkie',
  'Tabele zostały opróżnione.',
  'Tabele zostały przeniesione.',
  'Tabele zostały skopiowane.',
  'Tabele zostały usunięte.',
  'Tabele zostały zoptymalizowane.',
  'Schemat',
  'Tabele i perspektywy',
  'Wyszukaj we wszystkich tabelach',
  'Składowanie',
  'Rozmiar danych',
  'Rozmiar indeksów',
  'Wolne miejsce',
  'Liczba rekordów',
  'Wyczyść',
  'Optymalizuj',
  'Sprawdź',
  'Analizuj',
  'Napraw',
  'Opróżnij',
  'Przenieś do innej bazy danych',
  'Przenieś',
  'Kopiuj',
  'nadpisz',
  'Harmonogram',
  'O danym czasie',
  'Zmień typ',
];
		case "pt": return [
  '%.3f s',
  'Não é possível enviar o ficheiro.',
  'Tamanho máximo do ficheiro é %sB.',
  'Ficheiro não existe.',
  ' ',
  '0123456789',
  'Tipos definidos pelo utilizador',
  'Tem a certeza?',
  'Increase %s.',
  'Importação de ficheiros desativada.',
  'original',
  'Não existem tabelas.',
  'Modificar',
  'Inserir',
  'Não existem registos.',
  'You have no privileges to update this table.',
  'Guardar',
  'Guardar e continuar a edição',
  'Guardar e inserir outro',
  'Saving',
  'Eliminar',
  'Idioma',
  'Usar',
  'Unknown error.',
  'Motor de Base de dados',
  'Servidor',
  'hostname[:port] or :socket',
  'Nome de utilizador',
  'Senha',
  'Base de dados',
  'Entrar',
  'Memorizar a senha',
  'Adminer does not support accessing a database without a password, <a href="https://www.adminer.org/en/password/"%s>more information</a>.',
  'Selecionar dados',
  'Mostrar estrutura',
  'Modificar vista',
  'Modificar estrutura',
  'Novo Registo',
  'Warnings',
  [
    '%d byte',
    '%d bytes',
  ],
  'Coluna',
  'Tipo',
  'Comentário',
  'Incremento Automático',
  'Default value',
  'Selecionar',
  'Funções',
  'Adições',
  'Procurar',
  'qualquer local',
  'Ordenar',
  'decrescente',
  'Limite',
  'Tamanho do texto',
  'Ação',
  'Full table scan',
  'Comando SQL',
  'abrir',
  'guardar',
  'Modificar Base de dados',
  'Modificar esquema',
  'Criar esquema',
  'Esquema de Base de dados',
  'Privilégios',
  'Procedimentos',
  'Sequências',
  'Eventos',
  'Importar',
  'Exportar',
  'Criar tabela',
  'DB',
  'registos',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  'Disable %s or enable %s or %s extensions.',
  'Números',
  'Data e hora',
  'Cadeia',
  'Listas',
  'Binário',
  'Geometria',
  'ltr',
  'You are offline.',
  'Terminar sessão',
  'Too many unsuccessful logins, try again in %d minute(s).',
  'Sessão terminada com sucesso.',
  'Thanks for using Adminer, consider <a href="https://www.adminer.org/en/donation/">donating</a>.',
  'Sessão expirada, por favor entre de novo.',
  'Master password expired. <a href="https://www.adminer.org/en/extension/"%s>Implement</a> %s method to make it permanent.',
  'As sessões devem estar ativas.',
  'The action will be performed after successful login with the same credentials.',
  'Não há extensão',
  'Nenhuma das extensões PHP suportadas (%s) está disponivel.',
  'Connecting to privileged ports is not allowed.',
  'Identificação inválida.',
  'There is a space in the input password which might be the cause.',
  'Token CSRF inválido. Enviar o formulario novamente.',
  'Quantidade máxima de campos permitidos excedidos. Por favor aumente %s.',
  'If you did not send this request from Adminer then close this page.',
  'POST data demasiado grande. Reduza o tamanho ou aumente a diretiva de configuração %s.',
  'You can upload a big SQL file via FTP and import it from server.',
  'Chaves estrangeiras',
  'collation',
  'ON UPDATE',
  'ON DELETE',
  'Nome da coluna',
  'Nome de Parâmetro',
  'Tamanho',
  'Opções',
  'Adicionar próximo',
  'Mover para cima',
  'Mover para baixo',
  'Remover',
  'Base de dados inválida.',
  'Bases de dados eliminadas.',
  'Selecionar Base de dados',
  'Criar Base de dados',
  'Lista de processos',
  'Variáveis',
  'Estado',
  'Versão %s: %s através da extensão PHP %s',
  'Ligado como: %s',
  'Atualizar',
  'Colação',
  'Tabelas',
  'Size',
  'Compute',
  'Selected',
  'Remover',
  'Loaded plugins',
  'screenshot',
  'Materialized view',
  'Visualizar',
  'Tabela',
  'Inherits from',
  'Índices',
  'Modificar índices',
  'Origem',
  'Destino',
  'Modificar',
  'Adicionar Chave estrangeira',
  'Checks',
  'Create check',
  'Triggers',
  'Adicionar trigger',
  'Inherited by',
  'Permanent link',
  'Saída',
  'Formato',
  'Dados',
  'Criar utilizador',
  'ATTACH queries are not supported.',
  'Erro na consulta',
  '%d / ',
  [
    '%d registo',
    '%d registos',
  ],
  [
    'Consulta executada, %d registo afetado.',
    'Consulta executada, %d registos afetados.',
  ],
  'Nenhum comando para executar.',
  [
    '%d consulta sql executada corretamente.',
    '%d consultas sql executadas corretamente.',
  ],
  'Executar',
  'Limit rows',
  'Importar ficheiro',
  'Do servidor',
  'Ficheiro do servidor web %s',
  'Executar ficheiro',
  'Parar em caso de erro',
  'Mostrar somente erros',
  'Histórico',
  'Limpar',
  'Edit all',
  'Registo eliminado.',
  'Registo modificado.',
  'Registo%s inserido.',
  'Tabela eliminada.',
  'Tabela modificada.',
  'Tabela criada.',
  'Nome da tabela',
  'motor',
  'Valores predeterminados',
  'Drop %s?',
  'Particionar por',
  'Partições',
  'Nome da Partição',
  'Valores',
  'Índices modificados.',
  'Tipo de índice',
  'Algorithm',
  'Columns',
  'tamanho',
  'Nome',
  'Condition',
  'Base de dados eliminada.',
  'Base de dados renomeada.',
  'Base de dados criada.',
  'Base de dados modificada.',
  'Chamar',
  [
    'Consulta executada, %d registo afetado.',
    'Consulta executada, %d registos afetados.',
  ],
  'Chave estrangeira eliminada.',
  'Chave estrangeira modificada.',
  'Chave estrangeira criada.',
  'As colunas de origen e destino devem ser do mesmo tipo, deve existir um índice entre as colunas de destino e o registo referenciado deve existir.',
  'Chave estrangeira',
  'Tabela de destino',
  'Modificar',
  'Adicionar coluna',
  'Vista modificada.',
  'Vista eliminada.',
  'Vista criada.',
  'Criar vista',
  'Evento eliminado.',
  'Evento modificado.',
  'Evento criado.',
  'Modificar Evento',
  'Criar Evento',
  'Início',
  'Fim',
  'Cada',
  'Preservar ao completar',
  'Procedimento eliminado.',
  'Procedimento modificado.',
  'Procedimento criado.',
  'Modificar Função',
  'Modificar procedimento',
  'Criar função',
  'Criar procedimento',
  'Tipo de valor de regresso',
  'Check has been dropped.',
  'Check has been altered.',
  'Check has been created.',
  'Alter check',
  'Trigger eliminado.',
  'Trigger modificado.',
  'Trigger criado.',
  'Modificar Trigger',
  'Adicionar Trigger',
  'Tempo',
  'Evento',
  'Utilizador eliminado.',
  'Utilizador modificado.',
  'Utilizador criado.',
  'Hash',
  'Rotina',
  'Conceder',
  'Impedir',
  [
    '%d processo terminado.',
    '%d processos terminados.',
  ],
  'Clonar',
  '%d no total',
  'Parar',
  [
    '%d item afetado.',
    '%d itens afetados.',
  ],
  'Ctrl+clique vezes sobre o valor para edita-lo.',
  'File must be in UTF-8 encoding.',
  [
    '%d registo importado.',
    '%d registos importados.',
  ],
  'Não é possivel selecionar a Tabela',
  'Modify',
  'Relações',
  'modificar',
  'Utilize o link modificar para alterar.',
  'Load more data',
  'Loading',
  'Página',
  'último',
  'Resultado completo',
  'Tabelas truncadas (truncate).',
  'As Tabelas foram movidas.',
  'Tables have been copied.',
  'As tabelas foram eliminadas.',
  'Tables have been optimized.',
  'Esquema',
  'Tabelas e vistas',
  'Pesquisar dados nas Tabelas',
  'Motor',
  'Tamanho de dados',
  'Tamanho de índice',
  'Espaço Livre',
  'Registos',
  'Vacuum',
  'Otimizar',
  'Verificar',
  'Analizar',
  'Reparar',
  'Truncar',
  'Mover outra Base de dados',
  'Mover',
  'Copy',
  'overwrite',
  'Agenda',
  'À hora determinada',
  'agora',
];
		case "pt-br": return [
  '%.3f s',
  'Não é possível enviar o arquivo.',
  'Tamanho máximo do arquivo permitido é %sB.',
  'Arquivo não existe.',
  ' ',
  '0123456789',
  'Tipos definidos pelo usuário',
  'Você tem certeza?',
  'Increase %s.',
  'Importação de arquivos desabilitada.',
  'original',
  'Não existem tabelas.',
  'Editar',
  'Inserir',
  'Não existem registros.',
  'You have no privileges to update this table.',
  'Salvar',
  'Salvar e continuar editando',
  'Salvar e inserir outro',
  'Saving',
  'Deletar',
  'Idioma',
  'Usar',
  'Unknown error.',
  'Sistema',
  'Servidor',
  'hostname[:port] or :socket',
  'Usuário',
  'Senha',
  'Base de dados',
  'Entrar',
  'Login permanente',
  'Adminer does not support accessing a database without a password, <a href="https://www.adminer.org/en/password/"%s>more information</a>.',
  'Selecionar dados',
  'Mostrar estrutura',
  'Alterar visão',
  'Alterar estrutura',
  'Novo Registro',
  'Warnings',
  [
    '%d byte',
    '%d bytes',
  ],
  'Coluna',
  'Tipo',
  'Comentário',
  'Incremento Automático',
  'Default value',
  'Selecionar',
  'Funções',
  'Adições',
  'Procurar',
  'qualquer local',
  'Ordenar',
  'decrescente',
  'Limite',
  'Tamanho de texto',
  'Ação',
  'Full table scan',
  'Comando SQL',
  'abrir',
  'salvar',
  'Alterar Base de dados',
  'Alterar esquema',
  'Criar esquema',
  'Esquema de Base de dados',
  'Privilégios',
  'Rotinas',
  'Sequências',
  'Eventos',
  'Importar',
  'Exportar',
  'Criar tabela',
  'DB',
  'selecionar',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  'Disable %s or enable %s or %s extensions.',
  'Números',
  'Data e hora',
  'Strings',
  'Listas',
  'Binário',
  'Geometria',
  'ltr',
  'You are offline.',
  'Sair',
  'Too many unsuccessful logins, try again in %d minute(s).',
  'Saída bem sucedida.',
  'Thanks for using Adminer, consider <a href="https://www.adminer.org/en/donation/">donating</a>.',
  'Sessão expirada, por favor logue-se novamente.',
  'Master password expired. <a href="https://www.adminer.org/en/extension/"%s>Implement</a> %s method to make it permanent.',
  'Suporte a sessões deve estar habilitado.',
  'The action will be performed after successful login with the same credentials.',
  'Não há extension',
  'Nenhuma das extensões PHP suportadas (%s) está disponível.',
  'Connecting to privileged ports is not allowed.',
  'Identificação inválida.',
  'There is a space in the input password which might be the cause.',
  'Token CSRF inválido. Enviar o formulário novamente.',
  'Quantidade máxima de campos permitidos excedidos. Por favor aumente %s.',
  'If you did not send this request from Adminer then close this page.',
  'POST data demasiado grande. Reduza o tamanho ou aumente a diretiva de configuração %s.',
  'You can upload a big SQL file via FTP and import it from server.',
  'Chaves estrangeiras',
  'collation',
  'ON UPDATE',
  'ON DELETE',
  'Nome da coluna',
  'Nome de Parâmetro',
  'Tamanho',
  'Opções',
  'Adicionar próximo',
  'Mover acima',
  'Mover abaixo',
  'Remover',
  'Base de dados inválida.',
  'A Base de dados foi apagada.',
  'Selecionar Base de dados',
  'Criar Base de dados',
  'Lista de processos',
  'Variáveis',
  'Estado',
  'Versão %s: %s através da extensão PHP %s',
  'Logado como: %s',
  'Atualizar',
  'Colação',
  'Tabelas',
  'Size',
  'Compute',
  'Selected',
  'Apagar',
  'Loaded plugins',
  'screenshot',
  'Materialized view',
  'Visão',
  'Tabela',
  'Inherits from',
  'Índices',
  'Alterar índices',
  'Origem',
  'Destino',
  'Alterar',
  'Adicionar Chave Estrangeira',
  'Checks',
  'Create check',
  'Triggers',
  'Adicionar trigger',
  'Inherited by',
  'Permanent link',
  'Saída',
  'Formato',
  'Dados',
  'Criar Usuário',
  'ATTACH queries are not supported.',
  'Erro na consulta',
  '%d / ',
  [
    '%d registro',
    '%d registros',
  ],
  [
    'Consulta executada, %d registro afetado.',
    'Consulta executada, %d registros afetados.',
  ],
  'Nenhum comando para executar.',
  [
    '%d consulta sql executada corretamente.',
    '%d consultas sql executadas corretamente.',
  ],
  'Executar',
  'Limit rows',
  'Importar arquivo',
  'A partir do servidor',
  'Arquivo do servidor web %s',
  'Executar Arquivo',
  'Parar em caso de erro',
  'Mostrar somente erros',
  'Histórico',
  'Limpar',
  'Edit all',
  'O Registro foi deletado.',
  'O Registro foi atualizado.',
  'O Registro%s foi inserido.',
  'A Tabela foi eliminada.',
  'A Tabela foi alterada.',
  'A Tabela foi criada.',
  'Nome da tabela',
  'motor',
  'Valores padrões',
  'Drop %s?',
  'Particionar por',
  'Partições',
  'Nome da Partição',
  'Valores',
  'Os Índices foram alterados.',
  'Tipo de índice',
  'Algorithm',
  'Columns',
  'tamanho',
  'Nome',
  'Condition',
  'A Base de dados foi apagada.',
  'A Base de dados foi renomeada.',
  'A Base de dados foi criada.',
  'A Base de dados foi alterada.',
  'Chamar',
  [
    'Rotina executada, %d registro afetado.',
    'Rotina executada, %d registros afetados.',
  ],
  'A Chave Estrangeira foi apagada.',
  'A Chave Estrangeira foi alterada.',
  'A Chave Estrangeira foi criada.',
  'As colunas de origen e destino devem ser do mesmo tipo, deve existir um índice entre as colunas de destino e o registro referenciado deve existir.',
  'Chave Estrangeira',
  'Tabela de destino',
  'Modificar',
  'Adicionar coluna',
  'A Visão foi alterada.',
  'A Visão foi apagada.',
  'A Visão foi criada.',
  'Criar visão',
  'O Evento foi apagado.',
  'O Evento foi alterado.',
  'O Evento foi criado.',
  'Modificar Evento',
  'Criar Evento',
  'Início',
  'Fim',
  'Cada',
  'Ao completar preservar',
  'A Rotina foi apagada.',
  'A Rotina foi alterada.',
  'A Rotina foi criada.',
  'Alterar função',
  'Alterar procedimento',
  'Criar função',
  'Criar procedimento',
  'Tipo de valor de retorno',
  'Check has been dropped.',
  'Check has been altered.',
  'Check has been created.',
  'Alter check',
  'O Trigger foi apagado.',
  'O Trigger foi alterado.',
  'O Trigger foi criado.',
  'Alterar Trigger',
  'Adicionar Trigger',
  'Tempo',
  'Evento',
  'O Usuário foi apagado.',
  'O Usuário foi alterado.',
  'O Usuário foi criado.',
  'Hash',
  'Rotina',
  'Conceder',
  'Impedir',
  [
    '%d processo foi terminado.',
    '%d processos foram terminados.',
  ],
  'Clonar',
  '%d no total',
  'Parar',
  [
    '%d item foi afetado.',
    '%d itens foram afetados.',
  ],
  'Ctrl+clique sobre o valor para edita-lo.',
  'File must be in UTF-8 encoding.',
  [
    '%d registro foi importado.',
    '%d registros foram importados.',
  ],
  'Não é possível selecionar a Tabela',
  'Modify',
  'Relações',
  'editar',
  'Utilize o link editar para modificar este valor.',
  'Load more data',
  'Loading',
  'Página',
  'último',
  'Resultado completo',
  'As Tabelas foram truncadas.',
  'As Tabelas foram movidas.',
  'Tables have been copied.',
  'As Tabelas foram eliminadas.',
  'Tables have been optimized.',
  'Esquema',
  'Tabelas e Visões',
  'Buscar dados nas Tabelas',
  'Motor',
  'Tamanho de dados',
  'Tamanho de índice',
  'Espaço Livre',
  'Registros',
  'Vacuum',
  'Otimizar',
  'Verificar',
  'Analisar',
  'Reparar',
  'Truncar',
  'Mover para outra Base de dados',
  'Mover',
  'Copy',
  'overwrite',
  'Agenda',
  'A hora determinada',
  'agora',
];
		case "ro": return [
  '%.3f s',
  'Nu am putut încărca fișierul pe server.',
  'Fișierul maxim admis - %sO.',
  'Acest fișier nu există.',
  ',',
  '0123456789',
  'Tipuri de utilizatori',
  'Sunteți sigur(ă)?',
  'Increase %s.',
  'Încărcarea fișierelor este interzisă.',
  'original',
  'În baza de date nu sunt tabele.',
  'Editează',
  'Inserează',
  'Nu sunt înscrieri.',
  'You have no privileges to update this table.',
  'Salvează',
  'Salvează și continuă editarea',
  'Salvează și mai inserează',
  'Saving',
  'Șterge',
  'Limba',
  'Alege',
  'Unknown error.',
  'Sistem',
  'Server',
  'hostname[:port] or :socket',
  'Nume de utilizator',
  'Parola',
  'Baza de date',
  'Intră',
  'Logare permanentă',
  'Adminer does not support accessing a database without a password, <a href="https://www.adminer.org/en/password/"%s>more information</a>.',
  'Selectează',
  'Arată structura',
  'Modifică reprezentarea',
  'Modifică tabelul',
  'Înscriere nouă',
  'Warnings',
  [
    '%d octet',
    '%d octeți',
  ],
  'Coloană',
  'Tip',
  'Comentariu',
  'Creșterea automată',
  'Default value',
  'Selectează',
  'Funcții',
  'Agregare',
  'Căutare',
  'oriunde',
  'Sortare',
  'descrescător',
  'Limit',
  'Lungimea textului',
  'Acțiune',
  'Full table scan',
  'SQL query',
  'deschide',
  'salvează',
  'Modifică baza de date',
  'Modifică schema',
  'Crează o schemă',
  'Schema bazei de date',
  'Privilegii',
  'Proceduri și funcții salvate',
  '«Secvențe»',
  'Evenimente',
  'Importă',
  'Export',
  'Crează tabel',
  'DB',
  'selectează',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  'Disable %s or enable %s or %s extensions.',
  'Număr',
  'Data și timpul',
  'Șiruri de caractere',
  'Liste',
  'Tip binar',
  'Geometrie',
  'ltr',
  'You are offline.',
  'Ieșire',
  'Too many unsuccessful logins, try again in %d minute(s).',
  'Ați ieșit cu succes.',
  'Thanks for using Adminer, consider <a href="https://www.adminer.org/en/donation/">donating</a>.',
  'Timpul sesiunii a expirat, rog să vă conectați din nou.',
  'Master password expired. <a href="https://www.adminer.org/en/extension/"%s>Implement</a> %s method to make it permanent.',
  'Sesiunile trebuie să fie pornite.',
  'The action will be performed after successful login with the same credentials.',
  'Nu este extensie',
  'Nu este aviabilă nici o extensie suportată (%s).',
  'Connecting to privileged ports is not allowed.',
  'Numele de utilizator sau parola este greșită.',
  'There is a space in the input password which might be the cause.',
  'CSRF token imposibil. Retrimite forma.',
  'Numărul maxim de înscrieri disponibile a fost atins. Majorați %s.',
  'If you did not send this request from Adminer then close this page.',
  'Mesajul POST este prea mare. Trimiteți mai puține date sau măriți parametrul configurației directivei %s.',
  'You can upload a big SQL file via FTP and import it from server.',
  'Chei externe',
  'colaționarea',
  'La modificare',
  'La ștergere',
  'Denumirea coloanei',
  'Numele parametrului',
  'Lungime',
  'Acțiune',
  'Adaugă încă',
  'Mișcă în sus',
  'Mișcă în jos',
  'Șterge',
  'Bază de deate invalidă.',
  'Bazele de date au fost șterse.',
  'Alege baza de date',
  'Crează baza de date',
  'Lista proceselor',
  'Variabile',
  'Stare',
  'Versiunea %s: %s cu extensia PHP %s',
  'Ați intrat ca: %s',
  'Împrospătează',
  'Colaționare',
  'Tabele',
  'Size',
  'Compute',
  'Selected',
  'Șterge',
  'Loaded plugins',
  'screenshot',
  'Materialized view',
  'Reprezentare',
  'Tabel',
  'Inherits from',
  'Indexuri',
  'Modifică indexuri',
  'Sursă',
  'Scop',
  'Modifică',
  'Adaugă cheie externă',
  'Checks',
  'Create check',
  'Declanșatoare',
  'Adaugă trigger (declanșator)',
  'Inherited by',
  'Adresă permanentă',
  'Date de ieșire',
  'Format',
  'Date',
  'Crează utilizator',
  'ATTACH queries are not supported.',
  'Greșeală în query',
  '%d / ',
  [
    '%d înscriere',
    '%d înscrieri',
  ],
  [
    'Query executat, %d înscriere modificată.',
    'Query executat, %d înscrieri modificate.',
  ],
  'Nu sunt comenzi de executat.',
  [
    '%d query executat.',
    '%d query-uri executate cu succes.',
  ],
  'Execută',
  'Limit rows',
  'Încarcă fișierul',
  'De pe server',
  'Fișierul %s pe server',
  'Execută fișier',
  'Se oprește la greșeală',
  'Arată doar greșeli',
  'Istoria',
  'Curăță',
  'Editează tot',
  'Înregistrare a fost ștearsă.',
  'Înregistrare a fost înnoită.',
  'Înregistrarea%s a fost inserată.',
  'Tabelul a fost șters.',
  'Tabelul a fost modificat.',
  'Tabelul a fost creat.',
  'Denumirea tabelului',
  'tip',
  'Valoarea inițială',
  'Drop %s?',
  'Împarte',
  'Secțiuni',
  'Denumirea secțiunii',
  'Parametru',
  'Indexurile au fost modificate.',
  'Tipul indexului',
  'Algorithm',
  'Columns',
  'lungimea',
  'Titlu',
  'Condition',
  'Baza de date a fost ștearsă.',
  'Baza de date a fost redenumită.',
  'Baza de date a fost creată.',
  'Baza de date a fost modificată.',
  'Apelează',
  [
    'A fost executată procedura, %d înscriere a fost modificată.',
    'A fost executată procedura, %d înscrieri au fost modificate.',
  ],
  'Cheia externă a fost ștearsă.',
  'Cheia externă a fost modificată.',
  'Cheia externă a fost creată.',
  'Coloanele ar trebui să aibă aceleaşi tipuri de date, trebuie să existe date de referinţă și un index pe coloanela-ţintă.',
  'Cheie externă',
  'Tabela scop',
  'Modifică',
  'Adaugă coloană',
  'Reprezentarea a fost modificată.',
  'Reprezentarea a fost ștearsă.',
  'Reprezentarea a fost creată.',
  'Crează reprezentare',
  'Evenimentul a fost șters.',
  'Evenimentul a fost modificat.',
  'Evenimentul a fost adăugat.',
  'Modifică eveniment',
  'Creează evenimet',
  'Început',
  'Sfârșit',
  'Fiecare',
  'Salvează după finisare',
  'Procedura a fost ștearsă.',
  'Procedura a fost modificată.',
  'Procedura a fost creată.',
  'Modifică funcția',
  'Modifică procedura',
  'Crează funcție',
  'Crează procedură',
  'Tipul returnării',
  'Check has been dropped.',
  'Check has been altered.',
  'Check has been created.',
  'Alter check',
  'Triggerul a fost șters.',
  'Triggerul a fost modificat.',
  'Triggerul a fost creat.',
  'Modifică trigger',
  'Crează trigger',
  'Timp',
  'Eveniment',
  'Utilizatorul a fost șters.',
  'Utilizatorul a fost modificat.',
  'Utilizatorul a fost creat.',
  'Hashed',
  'Procedură',
  'Permite',
  'Interzice',
  [
    'A fost terminat %d proces.',
    'Au fost terminate %d procese.',
  ],
  'Clonează',
  'În total %d',
  'Termină',
  [
    'A fost modificată %d înscriere.',
    'Au fost modificate %d înscrieri.',
  ],
  'Ctrl+click pe o valoare pentru a o modifica.',
  'File must be in UTF-8 encoding.',
  [
    '%d rînd importat.',
    '%d rînduri importate.',
  ],
  'Nu am putut selecta date din tabel',
  'Modify',
  'Relații',
  'editare',
  'Valoare poate fi modificată cu ajutorul butonului «modifică».',
  'Load more data',
  'Loading',
  'Pagina',
  'ultima',
  'Tot rezultatul',
  'Tabelele au fost curățate.',
  'Tabelele au fost mutate.',
  'Tabelele au fost copiate.',
  'Tabelele au fost șterse.',
  'Tables have been optimized.',
  'Schema',
  'Tabele și reprezentări',
  'Caută în tabele',
  'Tip',
  'Cantitatea de date',
  'Cantitatea de indecși',
  'Spațiu liber',
  'Înscrieri',
  'Vacuum',
  'Optimizează',
  'Controlează',
  'Analizează',
  'Repară',
  'Curăță',
  'Mută în altă bază de date',
  'Mută',
  'Copiază',
  'overwrite',
  'Program',
  'În timpul curent',
  'HH:MM:SS',
];
		case "ru": return [
  '%.3f s',
  'Не удалось загрузить файл на сервер.',
  'Максимальный разрешённый размер файла — %sB.',
  'Такого файла не существует.',
  ' ',
  '0123456789',
  'Типы пользователей',
  'Вы уверены?',
  'Increase %s.',
  'Загрузка файлов на сервер запрещена.',
  'исходный',
  'В базе данных нет таблиц.',
  'Редактировать',
  'Вставить',
  'Нет записей.',
  'У вас нет прав на обновление этой таблицы.',
  'Сохранить',
  'Сохранить и продолжить редактирование',
  'Сохранить и вставить ещё',
  'Сохранение',
  'Стереть',
  'Язык',
  'Выбрать',
  'Неизвестная ошибка.',
  'Движок',
  'Сервер',
  'hostname[:port] or :socket',
  'Имя пользователя',
  'Пароль',
  'База данных',
  'Войти',
  'Оставаться в системе',
  'Adminer не поддерживает доступ к базе данных без пароля, <a href="https://www.adminer.org/en/password/"%s>больше информации</a>.',
  'Выбрать',
  'Показать структуру',
  'Изменить представление',
  'Изменить таблицу',
  'Новая запись',
  'Предупреждения',
  [
    '%d байт',
    '%d байта',
    '%d байтов',
  ],
  'поле',
  'Тип',
  'Комментарий',
  'Автоматическое приращение',
  'Значение по умолчанию',
  'Выбрать',
  'Функции',
  'Агрегация',
  'Поиск',
  'в любом месте',
  'Сортировать',
  'по убыванию',
  'Лимит',
  'Длина текста',
  'Действие',
  'Анализ полной таблицы',
  'SQL-запрос',
  'открыть',
  'сохранить',
  'Изменить базу данных',
  'Изменить схему',
  'Новая схема',
  'Схема базы данных',
  'Полномочия',
  'Хранимые процедуры и функции',
  '«Последовательности»',
  'События',
  'Импорт',
  'Экспорт',
  'Создать таблицу',
  'DB',
  'выбрать',
  '%s должна <a%s>вернуть массив</a>.',
  '<a%s>Настроить</a> %s в %s.',
  'Отключите %s или включите расширения %s или %s.',
  'Числа',
  'Дата и время',
  'Строки',
  'Списки',
  'Двоичный тип',
  'Геометрия',
  'ltr',
  'Вы не выполнили вход.',
  'Выйти',
  [
    'Слишком много неудачных попыток входа. Попробуйте снова через %d минуту.',
    'Слишком много неудачных попыток входа. Попробуйте снова через %d минуты.',
    'Слишком много неудачных попыток входа. Попробуйте снова через %d минут.',
  ],
  'Вы успешно покинули систему.',
  'Спасибо за использование Adminer, рассмотрите возможность <a href="https://www.adminer.org/en/donation/">пожертвования</a>.',
  'Срок действия сессии истёк, нужно снова войти в систему.',
  'Мастер-пароль истёк. <a href="https://www.adminer.org/en/extension/"%s>Реализуйте</a> метод %s, чтобы сделать его постоянным.',
  'Сессии должны быть включены.',
  'Действие будет выполнено после успешного входа в систему с теми же учетными данными.',
  'Нет расширений',
  'Недоступно ни одного расширения из поддерживаемых (%s).',
  'Подключение к привилегированным портам не допускается.',
  'Неправильное имя пользователя или пароль.',
  'В введеном пароле есть пробел, это может быть причиною.',
  'Недействительный CSRF-токен. Отправите форму ещё раз.',
  'Достигнуто максимальное значение количества доступных полей. Увеличьте %s.',
  'Если вы не посылали этот запрос из Adminer, закройте эту страницу.',
  'Слишком большой объем POST-данных. Пошлите меньший объём данных или увеличьте параметр конфигурационной директивы %s.',
  'Вы можете закачать большой SQL-файл по FTP и затем импортировать его с сервера.',
  'Внешние ключи',
  'режим сопоставления',
  'При обновлении',
  'При стирании',
  'Название поля',
  'Название параметра',
  'Длина',
  'Действие',
  'Добавить ещё',
  'Переместить вверх',
  'Переместить вниз',
  'Удалить',
  'Неверная база данных.',
  'Базы данных удалены.',
  'Выбрать базу данных',
  'Создать базу данных',
  'Список процессов',
  'Переменные',
  'Состояние',
  'Версия %s: %s с PHP-расширением %s',
  'Вы вошли как: %s',
  'Обновить',
  'Режим сопоставления',
  'Таблицы',
  'Размер',
  'Вычислить',
  'Выбранные',
  'Удалить',
  'Загруженные плагины',
  'screenshot',
  'Материализованное представление',
  'Представление',
  'Таблица',
  'Inherits from',
  'Индексы',
  'Изменить индексы',
  'Источник',
  'Цель',
  'Изменить',
  'Добавить внешний ключ',
  'Проверки',
  'Создать проверку',
  'Триггеры',
  'Добавить триггер',
  'Inherited by',
  'Постоянная ссылка',
  'Выходные данные',
  'Формат',
  'Данные',
  'Создать пользователя',
  'ATTACH-запросы не поддерживаются.',
  'Ошибка в запросe',
  '%d / ',
  [
    '%d строка',
    '%d строки',
    '%d строк',
  ],
  [
    'Запрос завершён, изменена %d запись.',
    'Запрос завершён, изменены %d записи.',
    'Запрос завершён, изменено %d записей.',
  ],
  'Нет команд для выполнения.',
  [
    '%d запрос выполнен успешно.',
    '%d запроса выполнено успешно.',
    '%d запросов выполнено успешно.',
  ],
  'Выполнить',
  'Лимит строк',
  'Загрузить файл на сервер',
  'С сервера',
  'Файл %s на вебсервере',
  'Запустить файл',
  'Остановить при ошибке',
  'Только ошибки',
  'История',
  'Очистить',
  'Редактировать всё',
  'Запись удалена.',
  'Запись обновлена.',
  'Запись%s была вставлена.',
  'Таблица была удалена.',
  'Таблица была изменена.',
  'Таблица была создана.',
  'Название таблицы',
  'Тип таблицы',
  'Значения по умолчанию',
  'Удалить %s?',
  'Разделить по',
  'Разделы',
  'Название раздела',
  'Параметры',
  'Индексы изменены.',
  'Тип индекса',
  'Algorithm',
  'Columns',
  'длина',
  'Название',
  'Condition',
  'База данных была удалена.',
  'База данных была переименована.',
  'База данных была создана.',
  'База данных была изменена.',
  'Вызвать',
  [
    'Была вызвана процедура, %d запись была изменена.',
    'Была вызвана процедура, %d записи было изменено.',
    'Была вызвана процедура, %d записей было изменено.',
  ],
  'Внешний ключ был удалён.',
  'Внешний ключ был изменён.',
  'Внешний ключ был создан.',
  'Поля должны иметь одинаковые типы данных, в результирующем поле должен быть индекс, данные для импорта должны существовать.',
  'Внешний ключ',
  'Результирующая таблица',
  'Изменить',
  'Добавить поле',
  'Представление было изменено.',
  'Представление было удалено.',
  'Представление было создано.',
  'Создать представление',
  'Событие было удалено.',
  'Событие было изменено.',
  'Событие было создано.',
  'Изменить событие',
  'Создать событие',
  'Начало',
  'Конец',
  'Каждые',
  'После завершения сохранить',
  'Процедура была удалена.',
  'Процедура была изменена.',
  'Процедура была создана.',
  'Изменить функцию',
  'Изменить процедуру',
  'Создать функцию',
  'Создать процедуру',
  'Возвращаемый тип',
  'Проверка удалена.',
  'Проверка изменена.',
  'Проверка создана.',
  'Изменить проверку',
  'Триггер был удалён.',
  'Триггер был изменён.',
  'Триггер был создан.',
  'Изменить триггер',
  'Создать триггер',
  'Время',
  'Событие',
  'Пользователь был удалён.',
  'Пользователь был изменён.',
  'Пользователь был создан.',
  'Хешировано',
  'Процедура',
  'Позволить',
  'Запретить',
  [
    'Был завершён %d процесс.',
    'Было завершено %d процесса.',
    'Было завершено %d процессов.',
  ],
  'Клонировать',
  'Всего %d',
  'Завершить',
  [
    'Была изменена %d запись.',
    'Были изменены %d записи.',
    'Было изменено %d записей.',
  ],
  'Выполните Ctrl+Щелчок мышью по значению, чтобы его изменить.',
  'Файл должен быть в кодировке UTF-8.',
  [
    'Импортирована %d строка.',
    'Импортировано %d строки.',
    'Импортировано %d строк.',
  ],
  'Не удалось получить данные из таблицы',
  'Изменить',
  'Отношения',
  'редактировать',
  'Изменить это значение можно с помощью ссылки «изменить».',
  'Загрузить ещё данные',
  'Загрузка',
  'Страница',
  'последняя',
  'Весь результат',
  'Таблицы были очищены.',
  'Таблицы были перемещены.',
  'Таблицы скопированы.',
  'Таблицы были удалены.',
  'Таблицы оптимизированы.',
  'Схема',
  'Таблицы и представления',
  'Поиск в таблицах',
  'Тип таблиц',
  'Объём данных',
  'Объём индексов',
  'Свободное место',
  'Строк',
  'Вакуум',
  'Оптимизировать',
  'Проверить',
  'Анализировать',
  'Исправить',
  'Очистить',
  'Переместить в другую базу данных',
  'Переместить',
  'Копировать',
  'перезаписать',
  'Расписание',
  'В данное время',
  'База данных не поддерживает пароль.',
];
		case "sk": return [
  '%.3f s',
  'Súbor sa nepodarilo nahrať.',
  'Maximálna povolená veľkosť súboru je %sB.',
  'Súbor neexistuje.',
  ' ',
  '0123456789',
  'Užívateľské typy',
  'Naozaj?',
  'Increase %s.',
  'Nahrávánie súborov nie je povolené.',
  'originál',
  'Žiadne tabuľky.',
  'Upraviť',
  'Vložiť',
  'Žiadne riadky.',
  'Nemáte oprávnenie na aktualizáciu tejto tabuľky.',
  'Uložiť',
  'Uložiť a pokračovať v úpravách',
  'Uložiť a vložiť ďalší',
  'Ukladá sa',
  'Zmazať',
  'Jazyk',
  'Vybrať',
  'Neznáma chyba.',
  'Systém',
  'Server',
  'hostname[:port] or :socket',
  'Používateľ',
  'Heslo',
  'Databáza',
  'Prihlásiť sa',
  'Trvalé prihlásenie',
  'Adminer nepodporuje prístup k databáze bez hesla, <a href="https://www.adminer.org/sk/password/"%s>viac informácií</a>.',
  'Vypísať dáta',
  'Zobraziť štruktúru',
  'Zmeniť pohľad',
  'Zmeniť tabuľku',
  'Nová položka',
  'Varovania',
  [
    '%d bajt',
    '%d bajty',
    '%d bajtov',
  ],
  'Stĺpec',
  'Typ',
  'Komentár',
  'Auto Increment',
  'Predvolená hodnota',
  'Vypísať',
  'Funkcie',
  'Agregácia',
  'Vyhľadať',
  'kdekoľvek',
  'Zotriediť',
  'zostupne',
  'Limit',
  'Dĺžka textov',
  'Akcia',
  'Prechod celej tabuľky',
  'SQL príkaz',
  'otvoriť',
  'uložiť',
  'Zmeniť databázu',
  'Pozmeniť schému',
  'Vytvoriť schému',
  'Schéma databázy',
  'Oprávnenia',
  'Procedúry',
  'Sekvencia',
  'Udalosti',
  'Import',
  'Export',
  'Vytvoriť tabuľku',
  'DB',
  'vypísať',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  'Zakážte %s alebo povoľte rozšírenie %s alebo %s.',
  'Čísla',
  'Dátum a čas',
  'Reťazce',
  'Zoznamy',
  'Binárne',
  'Geometria',
  'ltr',
  'Ste offline.',
  'Odhlásiť',
  [
    'Príliš veľa pokusov o prihlásenie, skúste to znova za %d minutu.',
    'Príliš veľa pokusov o prihlásenie, skúste to znova za %d minuty.',
    'Príliš veľa pokusov o prihlásenie, skúste to znova za %d minút.',
  ],
  'Odhlásenie prebehlo v poriadku.',
  'Vďaka za používanie Admineru, <a href="https://www.adminer.org/sk/donation/">prispejte</a> na vývoj.',
  'Session vypršala, prihláste sa prosím znova.',
  'Platnosť hlavného hesla vypršala. <a href="https://www.adminer.org/cs/extension/"%s>Implementujte</a> metodu %s, aby platilo natrvalo.',
  'Session premenné musia byť povolené.',
  'Akcia sa vykoná po úspešnom prihlásení s rovnakými prihlasovacími údajmi.',
  'Žiadne rozšírenie',
  'Nie je dostupné žiadne z podporovaných rozšírení (%s).',
  'Pripojenie k privilegovaným portom nie je povolené.',
  'Neplatné prihlasovacie údaje.',
  'V zadanom hesle je medzera, ktorá môže byť príčinou.',
  'Neplatný token CSRF. Odošlite formulár znova.',
  'Bol prekročený maximálny počet povolených polí. Zvýšte prosím %s.',
  'Pokiaľ ste tento požiadavok neodoslali z Adminera, zatvorte túto stránku.',
  'Príliš veľké POST dáta. Zmenšite dáta alebo zvýšte hodnotu konfiguračej direktívy %s.',
  'Veľký SQL soubor môžete nahrať pomocou FTP a importovať ho zo servera.',
  'Cudzie kľúče',
  'porovnávanie',
  'Pri aktualizácii',
  'Pri zmazaní',
  'Názov stĺpca',
  'Názov parametra',
  'Dĺžka',
  'Voľby',
  'Pridať ďalší',
  'Presunúť hore',
  'Presunúť dolu',
  'Odobrať',
  'Nesprávna databáza.',
  'Databázy boli odstránené.',
  'Vybrať databázu',
  'Vytvoriť databázu',
  'Zoznam procesov',
  'Premenné',
  'Stav',
  'Verzia %s: %s cez PHP rozšírenie %s',
  'Prihlásený ako: %s',
  'Obnoviť',
  'Porovnávanie',
  'Tabuľky',
  'Veľkosť',
  'Spočítať',
  'Označené',
  'Odstrániť',
  'Loaded plugins',
  'screenshot',
  'Materializovaný pohľad',
  'Pohľad',
  'Tabuľka',
  'Inherits from',
  'Indexy',
  'Zmeniť indexy',
  'Zdroj',
  'Cieľ',
  'Zmeniť',
  'Pridať cudzí kľúč',
  'Kontroly',
  'Vytvoriť kontrolu',
  'Triggery',
  'Pridať trigger',
  'Inherited by',
  'Permanentný odkaz',
  'Výstup',
  'Formát',
  'Dáta',
  'Vytvoriť používateľa',
  'Dotazy ATTACH nie sú podporované.',
  'Chyba v dotaze',
  '%d / ',
  [
    '%d riadok',
    '%d riadky',
    '%d riadkov',
  ],
  [
    'Príkaz prebehol v poriadku, bol zmenený %d záznam.',
    'Príkaz prebehol v poriadku boli zmenené %d záznamy.',
    'Príkaz prebehol v poriadku bolo zmenených %d záznamov.',
  ],
  'Žiadne príkazy na vykonanie.',
  [
    'Bol vykonaný %d dotaz.',
    'Boli vykonané %d dotazy.',
    'Bolo vykonaných %d dotazov.',
  ],
  'Vykonať',
  'Limit riadkov',
  'Nahranie súboru',
  'Zo serveru',
  'Súbor %s na webovom serveri',
  'Spustiť súbor',
  'Zastaviť pri chybe',
  'Zobraziť iba chyby',
  'História',
  'Vyčistiť',
  'Upraviť všetko',
  'Položka bola vymazaná.',
  'Položka bola aktualizovaná.',
  'Položka%s bola vložená.',
  'Tabuľka bola odstránená.',
  'Tabuľka bola zmenená.',
  'Tabuľka bola vytvorená.',
  'Názov tabuľky',
  'úložisko',
  'Predvolené hodnoty',
  'Odstrániť %s?',
  'Rozdeliť podľa',
  'Oddiely',
  'Názov oddielu',
  'Hodnoty',
  'Indexy boli zmenené.',
  'Typ indexu',
  'Algorithm',
  'Columns',
  'dĺžka',
  'Názov',
  'Condition',
  'Databáza bola odstránená.',
  'Databáza bola premenovaná.',
  'Databáza bola vytvorená.',
  'Databáza bola zmenená.',
  'Zavolať',
  [
    'Procedúra bola zavolaná, bol zmenený %d záznam.',
    'Procedúra bola zavolaná, boli zmenené %d záznamy.',
    'Procedúra bola zavolaná, bolo zmenených %d záznamov.',
  ],
  'Cudzí kľúč bol odstránený.',
  'Cudzí kľúč bol zmenený.',
  'Cudzí kľúč bol vytvorený.',
  'Zdrojové a cieľové stĺpce musia mať rovnaký datový typ, nad cieľovými stĺpcami musí byť definovaný index a odkazované dáta musia existovať.',
  'Cudzí kľúč',
  'Cieľová tabuľka',
  'Zmeniť',
  'Pridať stĺpec',
  'Pohľad bol zmenený.',
  'Pohľad bol odstránený.',
  'Pohľad bol vytvorený.',
  'Vytvoriť pohľad',
  'Udalosť bola odstránená.',
  'Udalosť bola zmenená.',
  'Udalosť bola vytvorená.',
  'Upraviť udalosť',
  'Vytvoriť udalosť',
  'Začiatok',
  'Koniec',
  'Každých',
  'Po dokončení zachovat',
  'Procedúra bola odstránená.',
  'Procedúra bola zmenená.',
  'Procedúra bola vytvorená.',
  'Zmeniť funkciu',
  'Zmeniť procedúru',
  'Vytvoriť funkciu',
  'Vytvoriť procedúru',
  'Návratový typ',
  'Kontrola bola odstránená.',
  'Kontrola bola zmenená.',
  'Kontrola bola vytvorená.',
  'Zmeniť kontrolu',
  'Trigger bol odstránený.',
  'Trigger bol zmenený.',
  'Trigger bol vytvorený.',
  'Zmeniť trigger',
  'Vytvoriť trigger',
  'Čas',
  'Udalosť',
  'Používateľ bol odstránený.',
  'Používateľ bol zmenený.',
  'Používateľ bol vytvorený.',
  'Zahašované',
  'Procedúra',
  'Povoliť',
  'Zakázať',
  [
    'Bol ukončený %d proces.',
    'Boli ukončené %d procesy.',
    'Bolo ukončených %d procesov.',
  ],
  'Klonovať',
  '%d celkom',
  'Ukončiť',
  '%d položiek bolo ovplyvnených.',
  'Ctrl+kliknite na políčko, ktoré chcete zmeniť.',
  'Súbor musí byť v kódovaní UTF-8.',
  [
    'Bol importovaný %d záznam.',
    'Boli importované %d záznamy.',
    'Bolo importovaných %d záznamov.',
  ],
  'Tabuľku sa nepodarilo vypísať',
  'Zmeniť',
  'Vzťahy',
  'upraviť',
  'Pre zmenu tejto hodnoty použite odkaz upraviť.',
  'Načítať ďalšie dáta',
  'Načítava sa',
  'Stránka',
  'posledný',
  'Celý výsledok',
  'Tabuľka bola vyprázdnená.',
  'Tabuľka bola presunutá.',
  'Tabuľky boli skopírované.',
  'Tabuľka bola odstránená.',
  'Tabuľky boli optimalizované.',
  'Schéma',
  'Tabuľky a pohľady',
  'Vyhľadať dáta v tabuľkách',
  'Typ',
  'Veľkosť dát',
  'Veľkosť indexu',
  'Voľné miesto',
  'Riadky',
  'Vyčistiť',
  'Optimalizovať',
  'Skontrolovať',
  'Analyzovať',
  'Opraviť',
  'Vyprázdniť',
  'Presunúť do inej databázy',
  'Presunúť',
  'Kopírovať',
  'prepísať',
  'Plán',
  'V stanovený čas',
  'nie',
];
		case "sl": return [
  '%.3f s',
  'Ne morem naložiti datoteke.',
  'Največja velikost datoteke je %sB.',
  'Datoteka ne obstaja.',
  ' ',
  '0123456789',
  'Uporabniški tipi',
  'Ste prepričani?',
  'Increase %s.',
  'Nalaganje datotek je onemogočeno.',
  'original',
  'Ni tabel.',
  'Uredi',
  'Vstavi',
  'Ni vrstic.',
  'You have no privileges to update this table.',
  'Shrani',
  'Shrani in nadaljuj z urejanjem',
  'Shrani in vstavi tekst',
  'Saving',
  'Izbriši',
  'Jezik',
  'Uporabi',
  'Unknown error.',
  'Sistem',
  'Strežnik',
  'hostname[:port] or :socket',
  'Uporabniško ime',
  'Geslo',
  'Baza',
  'Prijavi se',
  'Trajna prijava',
  'Adminer does not support accessing a database without a password, <a href="https://www.adminer.org/en/password/"%s>more information</a>.',
  'Izberi podatke',
  'Pokaži zgradbo',
  'Spremeni pogled',
  'Spremeni tabelo',
  'Nov predmet',
  'Warnings',
  [
    '%d bajt',
    '%d bajta',
    '%d bajti',
    '%d bajtov',
  ],
  'Stolpec',
  'Tip',
  'Komentar',
  'Samodejno povečevanje',
  'Default value',
  'Izberi',
  'Funkcije',
  'Združitev',
  'Išči',
  'kjerkoli',
  'Sortiraj',
  'padajoče',
  'Limita',
  'Dolžina teksta',
  'Dejanje',
  'Full table scan',
  'Ukaz SQL',
  'odpri',
  'shrani',
  'Spremeni bazo',
  'Spremeni shemo',
  'Ustvari shemo',
  'Shema baze',
  'Pravice',
  'Postopki',
  'Sekvence',
  'Dogodki',
  'Uvozi',
  'Izvozi',
  'Ustvari tabelo',
  'DB',
  'izberi',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  'Disable %s or enable %s or %s extensions.',
  'Števila',
  'Datum in čas',
  'Nizi',
  'Seznami',
  'Binarni',
  'Geometrčni',
  'ltr',
  'You are offline.',
  'Odjavi se',
  'Too many unsuccessful logins, try again in %d minute(s).',
  'Prijava uspešna.',
  'Thanks for using Adminer, consider <a href="https://www.adminer.org/en/donation/">donating</a>.',
  'Seja je potekla. Prosimo, ponovno se prijavite.',
  'Master password expired. <a href="https://www.adminer.org/en/extension/"%s>Implement</a> %s method to make it permanent.',
  'Podpora za seje mora biti omogočena.',
  'The action will be performed after successful login with the same credentials.',
  'Brez dodatkov',
  'Noben od podprtih dodatkov za PHP (%s) ni na voljo.',
  'Connecting to privileged ports is not allowed.',
  'Neveljavne pravice.',
  'There is a space in the input password which might be the cause.',
  'Neveljaven token CSRF. Pošljite formular še enkrat.',
  'Največje število dovoljenih polje je preseženo. Prosimo, povečajte %s.',
  'If you did not send this request from Adminer then close this page.',
  'Preveliko podatkov za POST. Zmanjšajte število podatkov ali povečajte nastavitev za %s.',
  'You can upload a big SQL file via FTP and import it from server.',
  'Tuji ključi',
  'zbiranje',
  'pri posodabljanju',
  'pri brisanju',
  'Ime stolpca',
  'Ime parametra',
  'Dolžina',
  'Možnosti',
  'Dodaj naslednjega',
  'Premakni gor',
  'Premakni dol',
  'Odstrani',
  'Neveljavna baza.',
  'Baze so zavržene.',
  'Izberi bazo',
  'Ustvari bazo',
  'Seznam procesov',
  'Spremenljivke',
  'Stanje',
  'Verzija %s: %s preko dodatka za PHP %s',
  'Prijavljen kot: %s',
  'Osveži',
  'Zbiranje',
  'Tabele',
  'Size',
  'Compute',
  'Selected',
  'Zavrzi',
  'Loaded plugins',
  'screenshot',
  'Materialized view',
  'Pogledi',
  'Tabela',
  'Inherits from',
  'Indeksi',
  'Spremeni indekse',
  'Izvor',
  'Cilj',
  'Spremeni',
  'Dodaj tuj ključ',
  'Checks',
  'Create check',
  'Sprožilniki',
  'Dodaj sprožilnik',
  'Inherited by',
  'Permanent link',
  'Izhod rezultata',
  'Format',
  'Podatki',
  'Ustvari uporabnika',
  'ATTACH queries are not supported.',
  'Napaka v poizvedbi',
  '%d / ',
  [
    '%d vrstica',
    '%d vrstici',
    '%d vrstice',
    '%d vrstic',
  ],
  [
    'Poizvedba se je uspešno izvedla, spremenjena je %d vrstica.',
    'Poizvedba se je uspešno izvedla, spremenjeni sta %d vrstici.',
    'Poizvedba se je uspešno izvedla, spremenjene so %d vrstice.',
    'Poizvedba se je uspešno izvedla, spremenjenih je %d vrstic.',
  ],
  'Ni ukazov za izvedbo.',
  [
    'Uspešno se je končala %d poizvedba.',
    'Uspešno sta se končali %d poizvedbi.',
    'Uspešno so se končale %d poizvedbe.',
    'Uspešno se je končalo %d poizvedb.',
  ],
  'Izvedi',
  'Limit rows',
  'Naloži datoteko',
  'z strežnika',
  'Datoteka na spletnem strežniku %s',
  'Zaženi datoteko',
  'Ustavi ob napaki',
  'Pokaži samo napake',
  'Zgodovina',
  'Počisti',
  'Edit all',
  'Predmet je izbrisan.',
  'Predmet je posodobljen.',
  'Predmet%s je vstavljen.',
  'Tabela je zavržena.',
  'Tabela je spremenjena.',
  'Tabela je ustvarjena.',
  'Ime tabele',
  'pogon',
  'Privzete vrednosti',
  'Drop %s?',
  'Porazdeli po',
  'Porazdelitve',
  'Ime porazdelitve',
  'Vrednosti',
  'Indeksi so spremenjeni.',
  'Tip indeksa',
  'Algorithm',
  'Columns',
  'dolžina',
  'Naziv',
  'Condition',
  'Baza je zavržena.',
  'Baza je preimenovana.',
  'Baza je ustvarjena.',
  'Baza je spremenjena.',
  'Pokliči',
  [
    'Klican je bil postopek, spremenjena je %d vrstica.',
    'Klican je bil postopek, spremenjeni sta %d vrstici.',
    'Klican je bil postopek, spremenjene so %d vrstice.',
    'Klican je bil postopek, spremenjenih je %d vrstic.',
  ],
  'Tuj ključ je zavržen.',
  'Tuj ključ je spremenjen.',
  'Tuj ključ je ustvarjen.',
  'Izvorni in ciljni stolpec mora imeti isti podatkovni tip. Obstajati mora indeks na ciljnih stolpcih in obstajati morajo referenčni podatki.',
  'Tuj ključ',
  'Ciljna tabela',
  'Spremeni',
  'Dodaj stolpec',
  'Pogled je spremenjen.',
  'Pogled je zavržen.',
  'Pogled je ustvarjen.',
  'Ustvari pogled',
  'Dogodek je zavržen.',
  'Dogodek je spremenjen.',
  'Dogodek je ustvarjen.',
  'Spremeni dogodek',
  'Ustvari dogodek',
  'Začetek',
  'Konec',
  'vsake',
  'Po zaključku ohrani',
  'Postopek je zavržen.',
  'Postopek je spremenjen.',
  'Postopek je ustvarjen.',
  'Spremeni funkcijo',
  'Spremeni postopek',
  'Ustvari funkcijo',
  'Ustvari postopek',
  'Vračalni tip',
  'Check has been dropped.',
  'Check has been altered.',
  'Check has been created.',
  'Alter check',
  'Sprožilnik je odstranjen.',
  'Sprožilnik je spremenjen.',
  'Sprožilnik je ustvarjen.',
  'Spremeni sprožilnik',
  'Ustvari sprožilnik',
  'Čas',
  'Dogodek',
  'Uporabnik je odstranjen.',
  'Uporabnik je spremenjen.',
  'Uporabnik je ustvarjen.',
  'Zakodirano',
  'Postopek',
  'Dovoli',
  'Odvzemi',
  [
    'Končan je %d proces.',
    'Končana sta %d procesa.',
    'Končani so %d procesi.',
    'Končanih je %d procesov.',
  ],
  'Kloniraj',
  'Skupaj %d',
  'Končaj',
  [
    'Spremenjen je %d predmet.',
    'Spremenjena sta %d predmeta.',
    'Spremenjeni so %d predmeti.',
    'Spremenjenih je %d predmetov.',
  ],
  'Ctrl+klik na vrednost za urejanje.',
  'File must be in UTF-8 encoding.',
  [
    'Uvožena je %d vrstica.',
    'Uvoženi sta %d vrstici.',
    'Uvožene so %d vrstice.',
    'Uvoženih je %d vrstic.',
  ],
  'Ne morem izbrati tabele',
  'Modify',
  'Relacijski',
  'uredi',
  'Uporabite urejanje povezave za spreminjanje te vrednosti.',
  'Load more data',
  'Loading',
  'Stran',
  'Zadnja',
  'Cel razultat',
  'Tabele so skrajšane.',
  'Tabele so premaknjene.',
  'Tabele so kopirane.',
  'Tabele so zavržene.',
  'Tables have been optimized.',
  'Shema',
  'Tabele in pogledi',
  'Išče podatke po tabelah',
  'Pogon',
  'Velikost podatkov',
  'Velikost indeksa',
  'Podatkov prosto ',
  'Vrstic',
  'Vacuum',
  'Optimiziraj',
  'Preveri',
  'Analiziraj',
  'Popravi',
  'Skrajšaj',
  'Premakni v drugo bazo',
  'Premakni',
  'Kopiraj',
  'overwrite',
  'Urnik',
  'v danem času',
  'Spremeni tip',
];
		case "sr": return [
  '%.3f s',
  'Слање датотеке није успело.',
  'Највећа дозвољена величина датотеке је %sB.',
  'Датотека не постоји.',
  ',',
  '0123456789',
  'Кориснички типови',
  'Да ли сте сигурни?',
  'Increase %s.',
  'Онемогућено је слање датотека.',
  'оригинал',
  'Без табела.',
  'Измени',
  'Уметни',
  'Без редова.',
  'You have no privileges to update this table.',
  'Сачувај',
  'Сачувај и настави уређење',
  'Сачувај и уметни следеће',
  'Saving',
  'Избриши',
  'Језик',
  'Користи',
  'Unknown error.',
  'Систем',
  'Сервер',
  'hostname[:port] or :socket',
  'Корисничко име',
  'Лозинка',
  'База података',
  'Пријава',
  'Трајна пријава',
  'Adminer does not support accessing a database without a password, <a href="https://www.adminer.org/en/password/"%s>more information</a>.',
  'Изабери податке',
  'Прикажи структуру',
  'Уреди поглед',
  'Уреди табелу',
  'Нова ставка',
  'Warnings',
  [
    '%d бајт',
    '%d бајта',
    '%d бајтова',
  ],
  'Колона',
  'Тип',
  'Коментар',
  'Ауто-прираштај',
  'Default value',
  'Изабери',
  'Функције',
  'Сакупљање',
  'Претрага',
  'било где',
  'Поређај',
  'опадајуће',
  'Граница',
  'Дужина текста',
  'Акција',
  'Скренирање комплетне табеле',
  'SQL команда',
  'отвори',
  'сачувај',
  'Уреди базу података',
  'Уреди шему',
  'Формирај шему',
  'Шема базе података',
  'Дозволе',
  'Рутине',
  'Низови',
  'Догађаји',
  'Увоз',
  'Извоз',
  'Направи табелу',
  'DB',
  'изабери',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  'Disable %s or enable %s or %s extensions.',
  'Број',
  'Датум и време',
  'Текст',
  'Листе',
  'Бинарно',
  'Геометрија',
  'ltr',
  'You are offline.',
  'Одјава',
  'Too many unsuccessful logins, try again in %d minute(s).',
  'Успешна одјава.',
  'Thanks for using Adminer, consider <a href="https://www.adminer.org/en/donation/">donating</a>.',
  'Ваша сесија је истекла, пријавите се поново.',
  'Master password expired. <a href="https://www.adminer.org/en/extension/"%s>Implement</a> %s method to make it permanent.',
  'Морате омогућити подршку за сесије.',
  'The action will be performed after successful login with the same credentials.',
  'Без додатака',
  'Ниједан од подржаних PHP додатака (%s) није доступан.',
  'Connecting to privileged ports is not allowed.',
  'Неважеће дозволе.',
  'There is a space in the input password which might be the cause.',
  'Неважећи CSRF код. Проследите поново форму.',
  'Премашен је максимални број дозвољених поља. Молим увећајте %s.',
  'If you did not send this request from Adminer then close this page.',
  'Превелики POST податак. Морате да смањите податак или повећајте вредност конфигурационе директиве %s.',
  'You can upload a big SQL file via FTP and import it from server.',
  'Страни кључеви',
  'Сравњивање',
  'ON UPDATE (приликом освежавања)',
  'ON DELETE (приликом брисања)',
  'Назив колоне',
  'Назив параметра',
  'Дужина',
  'Опције',
  'Додај следећи',
  'Помери на горе',
  'Помери на доле',
  'Уклони',
  'Неисправна база података.',
  'Базњ података су избрисане.',
  'Изаберите базу',
  'Формирај базу података',
  'Списак процеса',
  'Променљиве',
  'Статус',
  '%s верзија: %s помоћу PHP додатка је %s',
  'Пријави се као: %s',
  'Освежи',
  'Сравњивање',
  'Табеле',
  'Size',
  'Compute',
  'Selected',
  'Избриши',
  'Loaded plugins',
  'screenshot',
  'Materialized view',
  'Поглед',
  'Табела',
  'Inherits from',
  'Индекси',
  'Уреди индексе',
  'Извор',
  'Циљ',
  'Уреди',
  'Додај страни кључ',
  'Checks',
  'Create check',
  'Окидачи',
  'Додај окидач',
  'Inherited by',
  'Трајна веза',
  'Испис',
  'Формат',
  'Податци',
  'Направи корисника',
  'ATTACH queries are not supported.',
  'Грешка у упиту',
  '%d / ',
  [
    '%d ред',
    '%d реда',
    '%d редова',
  ],
  [
    'Упит је успешно извршен, %d ред је погођен.',
    'Упит је успешно извршен, %d реда су погођена.',
    'Упит је успешно извршен, %d редова је погођено.',
  ],
  'Без команди за извршавање.',
  [
    '%d упит је успешно извршен.',
    '%d упита су успешно извршена.',
    '%d упита је успешно извршено.',
  ],
  'Изврши',
  'Limit rows',
  'Слање датотека',
  'Са сервера',
  'Датотека %s са веб сервера',
  'Покрени датотеку',
  'Заустави приликом грешке',
  'Приказуј само грешке',
  'Историјат',
  'Очисти',
  'Измени све',
  'Ставка је избрисана.',
  'Ставка је измењена.',
  'Ставка%s је додата.',
  'Табела је избрисана.',
  'Табела је измењена.',
  'Табела је креирана.',
  'Назив табеле',
  'механизам',
  'Подразумеване вредности',
  'Drop %s?',
  'Подели по',
  'Поделе',
  'Име поделе',
  'Вредности',
  'Индекси су измењени.',
  'Тип индекса',
  'Algorithm',
  'Columns',
  'дужина',
  'Име',
  'Condition',
  'База података је избрисана.',
  'База података је преименована.',
  'База података је креирана.',
  'База података је измењена.',
  'Позови',
  [
    'Позвана је рутина, %d ред је погођен.',
    'Позвана је рутина, %d реда су погођена.',
    'Позвана је рутина, %d редова је погођено.',
  ],
  'Страни кључ је избрисан.',
  'Страни кључ је измењен.',
  'Страни кључ је креиран.',
  'Изворне и циљне колоне морају бити истог типа, циљна колона мора бити индексирана и изворна табела мора садржати податке из циљне.',
  'Страни кључ',
  'Циљна табела',
  'Измени',
  'Додај колону',
  'Поглед је измењен.',
  'Поглед је избрисан.',
  'Поглед је креиран.',
  'Направи поглед',
  'Догађај је избрисан.',
  'Догађај је измењен.',
  'Догађај је креиран.',
  'Уреди догађај',
  'Направи догађај',
  'Почетак',
  'Крај',
  'Сваки',
  'Задржи по завршетку',
  'Рутина је избрисана.',
  'Рутина је измењена.',
  'Рутина је креирана.',
  'Уреди функцију',
  'Уреди процедуру',
  'Формирај функцију',
  'Формирај процедуру',
  'Повратни тип',
  'Check has been dropped.',
  'Check has been altered.',
  'Check has been created.',
  'Alter check',
  'Окидач је избрисан.',
  'Окидач је измењен.',
  'Окидач је креиран.',
  'Уреди окидач',
  'Формирај окидач',
  'Време',
  'Догађај',
  'Корисник је избрисан.',
  'Корисник је измењен.',
  'корисник је креиран.',
  'Хеширано',
  'Рутина',
  'Дозволи',
  'Опозови',
  [
    '%d процес је убијен.',
    '%d процеса су убијена.',
    '%d процеса је убијено.',
  ],
  'Дуплирај',
  'укупно %d',
  'Убиј',
  [
    '%d ставка је погођена.',
    '%d ставке су погођене.',
    '%d ставки је погођено.',
  ],
  'Ctrl+клик на вредност за измену.',
  'File must be in UTF-8 encoding.',
  [
    '%d ред је увежен.',
    '%d реда су увежена.',
    '%d редова је увежено.',
  ],
  'Не могу да изаберем табелу',
  'Modify',
  'Односи',
  'измени',
  'Користи везу за измену ове вредности.',
  'Учитавам још података',
  'Учитавам',
  'Страна',
  'последња',
  'Цео резултат',
  'Табеле су испражњене.',
  'Табеле су премешћене.',
  'Табеле су умножене.',
  'Табеле су избрисане.',
  'Табеле су оптимизоване.',
  'Шема',
  'Табеле и погледи',
  'Претражи податке у табелама',
  'Механизам',
  'Дужина података',
  'Дужина индекса',
  'Слободно података',
  'Редова',
  'Vacuum',
  'Оптимизуј',
  'Провери',
  'Анализирај',
  'Поправи',
  'Испразни',
  'Премести у другу базу података',
  'Премести',
  'Умножи',
  'overwrite',
  'Распоред',
  'У задато време',
  'Уреди тип',
];
		case "sv": return [
  '%.3f s',
  'Det går inte add ladda upp filen.',
  'Högsta tillåtna storlek är %sB.',
  'Filen finns inte.',
  ',',
  '0123456789',
  'Användartyper',
  'Är du säker?',
  'Increase %s.',
  'Filuppladdningar är avstängda.',
  'original',
  'Inga tabeller.',
  'Redigera',
  'Infoga',
  'Inga rader.',
  'Du har inga privilegier för att uppdatera den här tabellen.',
  'Spara',
  'Spara och fortsätt att redigera',
  'Spara och infoga nästa',
  'Sparar',
  'Ta bort',
  'Språk',
  'Använd',
  'Okänt fel.',
  'System',
  'Server',
  'hostname[:port] or :socket',
  'Användarnamn',
  'Lösenord',
  'Databas',
  'Logga in',
  'Permanent inloggning',
  'Adminer tillåter inte att ansluta till en databas utan lösenord. <a href="https://www.adminer.org/en/password/"%s>Mer information</a>.',
  'Välj data',
  'Visa struktur',
  'Ändra vy',
  'Ändra tabell',
  'Ny sak',
  'Varningar',
  [
    '%d byte',
    '%d bytes',
  ],
  'Kolumn',
  'Typ',
  'Kommentar',
  'Automatisk uppräkning',
  'Standardvärde',
  'Välj',
  'Funktioner',
  'Aggregation',
  'Sök',
  'överallt',
  'Sortera',
  'Fallande',
  'Begränsning',
  'Textlängd',
  'Åtgärd',
  'Full tabellskanning',
  'SQL-kommando',
  'Öppna',
  'Spara',
  'Ändra databas',
  'Redigera schema',
  'Skapa schema',
  'Databasschema',
  'Privilegier',
  'Rutiner',
  'Sekvenser',
  'Event',
  'Importera',
  'Exportera',
  'Skapa tabell',
  'DB',
  'välj',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  'Stäng av %s eller sätt på %s eller %s tilläggen.',
  'Nummer',
  'Datum och tid',
  'Strängar',
  'Listor',
  'Binärt',
  'Geometri',
  'ltr',
  'Du är offline.',
  'Logga ut',
  [
    'För många misslyckade inloggningar, försök igen om %d minut.',
    'För många misslyckade inloggningar, försök igen om %d minuter.',
  ],
  'Du är nu utloggad.',
  'Tack för att du använder Adminer, vänligen fundera över att <a href="https://www.adminer.org/en/donation/">donera</a>.',
  'Session har löpt ut, vänligen logga in igen.',
  'Huvudlösenordet har löpt ut. <a href="https://www.adminer.org/en/extension/"%s>Implementera</a> %s en metod för att göra det permanent.',
  'Support för sessioner måste vara på.',
  'Åtgärden kommer att utföras efter en lyckad inloggning med samma inloggningsuppgifter.',
  'Inget tillägg',
  'Inga av de PHP-tilläggen som stöds (%s) är tillgängliga.',
  'Anslutning till privilegierade portar är inte tillåtet.',
  'Ogiltiga inloggningsuppgifter.',
  'Det finns ett mellanslag i lösenordet, vilket kan vara anledningen.',
  'Ogiltig CSRF-token. Skicka formuläret igen.',
  'Högsta nummer tillåtna fält är överskridet. Vänligen höj %s.',
  'Om du inte skickade en förfrågan från Adminer så kan du stänga den här sidan.',
  'POST-datan är för stor. Minska det eller höj %s-direktivet.',
  'Du kan ladda upp en stor SQL-fil via FTP och importera det från servern.',
  'Främmande nycklar',
  'kollationering',
  'VID UPPDATERING',
  'VID BORTTAGNING',
  'Kolumnnamn',
  'Namn på parameter',
  'Längd',
  'Inställningar',
  'Lägg till nästa',
  'Flytta upp',
  'Flytta ner',
  'Ta bort',
  'Ogiltig databas.',
  'Databaserna har tagits bort.',
  'Välj databas',
  'Skapa databas',
  'Processlista',
  'Variabler',
  'Status',
  '%s version: %s genom PHP-tillägg %s',
  'Inloggad som: %s',
  'Ladda om',
  'Kollationering',
  'Tabeller',
  'Storlek',
  'Beräkna',
  'Vald',
  'Ta bort',
  'Loaded plugins',
  'screenshot',
  'Materialiserad vy',
  'Vy',
  'Tabell',
  'Inherits from',
  'Index',
  'Ändra index',
  'Källa',
  'Mål',
  'Ändra',
  'Lägg till främmande nyckel',
  'Checks',
  'Create check',
  'Avtryckare',
  'Lägg till avtryckare',
  'Inherited by',
  'Permanent länk',
  'Utmatning',
  'Format',
  'Data',
  'Skapa användare',
  'ATTACH-förfrågor stöds inte.',
  'Fel i förfrågan',
  '%d / ',
  [
    '%d rad',
    '%d rader',
  ],
  [
    'Förfrågan lyckades, %d rad påverkades.',
    'Förfrågan lyckades, %d rader påverkades.',
  ],
  'Inga kommandon att köra.',
  [
    '%d förfrågan lyckades.',
    '%d förfrågor lyckades.',
  ],
  'Kör',
  'Begränsa rader',
  'Ladda upp fil',
  'Från server',
  'Serverfil %s',
  'Kör fil',
  'Stanna på fel',
  'Visa bara fel',
  'Historia',
  'Rensa',
  'Redigera alla',
  'En sak har tagits bort.',
  'En sak har ändrats.',
  'Sak%s har skapats.',
  'Tabell har tagits bort.',
  'Tabell har ändrats.',
  'Tabell har skapats.',
  'Tabellnamn',
  'motor',
  'Standardvärden',
  'Ta bort %s?',
  'Partitionera om',
  'Partitioner',
  'Partition',
  'Värden',
  'Index har ändrats.',
  'Indextyp',
  'Algorithm',
  'Columns',
  'längd',
  'Namn',
  'Condition',
  'Databasen har tagits bort.',
  'Databasen har fått sitt namn ändrat.',
  'Databasen har skapats.',
  'Databasen har ändrats.',
  'Kalla',
  [
    'Rutin har kallats, %d rad påverkades.',
    'Rutin har kallats, %d rader påverkades.',
  ],
  'Främmande nyckel har tagits bort.',
  'Främmande nyckel har ändrats.',
  'Främmande nyckel har skapats.',
  'Käll- och mål-tabellen måste ha samma datatyp, ett index på målkolumnerna och refererad data måste finnas.',
  'Främmande nyckel',
  'Måltabell',
  'Ändra',
  'Lägg till kolumn',
  'Vy har ändrats.',
  'Vy har tagits bort.',
  'Vy har skapats.',
  'Skapa vy',
  'Event har tagits bort.',
  'Event har ändrats.',
  'Event har skapats.',
  'Ändra event',
  'Skapa event',
  'Start',
  'Slut',
  'Varje',
  'Bibehåll vid slutet',
  'Rutin har tagits bort.',
  'Rutin har ändrats.',
  'Rutin har skapats.',
  'Ändra funktion',
  'Ändra procedur',
  'Skapa funktion',
  'Skapa procedur',
  'Återvändningstyp',
  'Check has been dropped.',
  'Check has been altered.',
  'Check has been created.',
  'Alter check',
  'Avtryckare har tagits bort.',
  'Avtryckare har ändrats.',
  'Avtryckare har skapats.',
  'Ändra avtryckare',
  'Skapa avtryckare',
  'Tid',
  'Event',
  'Användare har blivit borttagen.',
  'Användare har blivit ändrad.',
  'Användare har blivit skapad.',
  'Hashad',
  'Rutin',
  'Tillåt',
  'Neka',
  [
    '%d process har avslutats.',
    '%d processer har avslutats.',
  ],
  'Klona',
  'totalt %d',
  'Avsluta',
  [
    '%d sak har blivit förändrad.',
    '%d saker har blivit förändrade.',
  ],
  'Ctrl+klicka på ett värde för att ändra det.',
  'Filer måste vara i UTF-8-format.',
  [
    '%d rad har importerats.',
    '%d rader har importerats.',
  ],
  'Kunde inte välja tabellen',
  'Ändra',
  'Relationer',
  'redigera',
  'Använd redigeringslänken för att ändra värdet.',
  'Ladda mer data',
  'Laddar',
  'Sida',
  'sist',
  'Hela resultatet',
  'Tabeller har blivit avkortade.',
  'Tabeller har flyttats.',
  'Tabeller har kopierats.',
  'Tabeller har tagits bort.',
  'Tabeller har optimerats.',
  'Schema',
  'Tabeller och vyer',
  'Sök data i tabeller',
  'Motor',
  'Datalängd',
  'Indexlängd',
  'Ledig data',
  'Rader',
  'Städa',
  'Optimera',
  'Kolla',
  'Analysera',
  'Reparera',
  'Avkorta',
  'Flytta till en annan databas',
  'Flytta',
  'Kopiera',
  'Skriv över',
  'Schemalägga',
  'Vid en tid',
  'Ändra typ',
];
		case "ta": return [
  '%.3f s',
  'கோப்பை மேலேற்ற‌ம் (upload) செய்ய‌ இயல‌வில்லை.',
  'கோப்பின் அதிக‌ப‌ட்ச‌ அள‌வு %sB.',
  'கோப்பு இல்லை.',
  ',',
  '0123456789',
  'ப‌ய‌னாள‌ர் வ‌கைக‌ள்',
  'நிச்ச‌ய‌மாக‌ ?',
  'Increase %s.',
  'கோப்புக‌ள் மேலேற்றம் (upload)முட‌க்க‌ப்ப‌ட்டுள்ள‌ன‌.',
  'அச‌ல்',
  'அட்ட‌வ‌ணை இல்லை.',
  'தொகு',
  'புகுத்து',
  'வ‌ரிசை இல்லை.',
  'You have no privileges to update this table.',
  'சேமி',
  'சேமித்த‌ பிற‌கு தொகுப்ப‌தை தொட‌ர‌வும்',
  'சேமித்த‌ப் பின் அடுத்த‌தை புகுத்து',
  'Saving',
  'நீக்கு',
  'மொழி',
  'உப‌யோகி',
  'Unknown error.',
  'சிஸ்ட‌ம் (System)',
  'வ‌ழ‌ங்கி (Server)',
  'hostname[:port] or :socket',
  'ப‌ய‌னாள‌ர் (User)',
  'க‌ட‌வுச்சொல்',
  'த‌க‌வ‌ல்த‌ள‌ம்',
  'நுழை',
  'நிர‌ந்த‌ர‌மாக‌ நுழைய‌வும்',
  'Adminer does not support accessing a database without a password, <a href="https://www.adminer.org/en/password/"%s>more information</a>.',
  'த‌க‌வ‌லை தேர்வு செய்',
  'க‌ட்ட‌மைப்பை காண்பிக்க‌வும்',
  'தோற்ற‌த்தை மாற்று',
  'அட்ட‌வ‌ணையை மாற்று',
  'புதிய‌ உருப்ப‌டி',
  'Warnings',
  [
    '%d பைட்',
    '%d பைட்டுக‌ள்',
  ],
  'நெடுவ‌ரிசை',
  'வ‌கை',
  'குறிப்பு',
  'ஏறுமான‌ம்',
  'Default value',
  'தேர்வு செய்',
  'Functions',
  'திர‌ள்வு (Aggregation)',
  'தேடு',
  'எங்காயினும்',
  'த‌ர‌ம் பிரி',
  'இற‌ங்குமுக‌மான‌',
  'வ‌ர‌ம்பு',
  'உரை நீள‌ம்',
  'செய‌ல்',
  'Full table scan',
  'SQL க‌ட்ட‌ளை',
  'திற‌',
  'சேமி',
  'த‌க‌வ‌ல்த‌ள‌த்தை மாற்று',
  'அமைப்புமுறையை மாற்று',
  'அமைப்புமுறையை உருவாக்கு',
  'த‌க‌வ‌ல்த‌ள‌ அமைப்பு முறைக‌ள்',
  'ச‌லுகைக‌ள் / சிற‌ப்புரிமைக‌ள்',
  'ரொட்டீன் ',
  'வ‌ரிசைமுறை',
  'நிக‌ழ்ச்சிக‌ள்',
  'இற‌க்கும‌தி (Import)',
  'ஏற்றும‌தி',
  'அட்ட‌வ‌ணையை உருவாக்கு',
  'DB',
  'தேர்வு செய்',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  'Disable %s or enable %s or %s extensions.',
  'எண்க‌ள்',
  'தேதி ம‌ற்றும் நேர‌ம்',
  'ச‌ர‌ம் (String)',
  'ப‌ட்டிய‌ல்',
  'பைன‌ரி',
  'வ‌டிவ‌விய‌ல் (Geometry)',
  'ltr',
  'You are offline.',
  'வெளியேறு',
  'Too many unsuccessful logins, try again in %d minute(s).',
  'வெற்றிக‌ர‌மாய் வெளியேறியாயிற்று.',
  'Thanks for using Adminer, consider <a href="https://www.adminer.org/en/donation/">donating</a>.',
  'செஷ‌ன் காலாவ‌தியாகி விட்ட‌து. மீண்டும் நுழைய‌வும்.',
  'Master password expired. <a href="https://www.adminer.org/en/extension/"%s>Implement</a> %s method to make it permanent.',
  'செஷ‌ன் ஆத‌ர‌வு இய‌க்க‌ப்ப‌ட‌ வேண்டும்.',
  'The action will be performed after successful login with the same credentials.',
  'விரிவு (extensஇஒன்) இல்லை ',
  'PHP ஆத‌ர‌வு விரிவுக‌ள் (%s) இல்லை.',
  'Connecting to privileged ports is not allowed.',
  'ச‌ரியான‌ விப‌ர‌ங்க‌ள் இல்லை.',
  'There is a space in the input password which might be the cause.',
  'CSRF டோக்க‌ன் செல்லாது. ப‌டிவ‌த்தை மீண்டும் அனுப்ப‌வும்.',
  'அனும‌திக்க‌ப்ப‌ட்ட‌ அதிக‌ப‌ட்ச‌ கோப்புக‌ளின் எண்ணிக்கை மீற‌ப்ப‌ட்ட‌து. த‌ய‌வு செய்து %s ம‌ற்றும் %s யை அதிக‌ரிக்க‌வும்.',
  'If you did not send this request from Adminer then close this page.',
  'மிக‌ அதிக‌மான‌ POST த‌க‌வ‌ல். த‌க‌வ‌லை குறைக்க‌வும் அல்ல‌து %s வ‌டிவ‌மைப்பை (configuration directive) மாற்ற‌வும்.',
  'You can upload a big SQL file via FTP and import it from server.',
  'வேற்று விசைக‌ள்',
  'கொலேச‌ன்',
  'ON UPDATE',
  'ON DELETE',
  'நெடுவ‌ரிசையின் பெய‌ர்',
  'அள‌புரு (Parameter) பெய‌ர்',
  'நீளம்',
  'வேண்டிய‌வ‌ற்றை ',
  'அடுத்த‌தை சேர்க்க‌வும்',
  'மேலே ந‌க‌ர்த்து',
  'கீழே நக‌ர்த்து',
  'நீக்கு',
  'த‌க‌வ‌ல்த‌ள‌ம் ச‌ரியானதல்ல‌.',
  'த‌க‌வ‌ல் த‌ள‌ங்க‌ள் நீக்க‌ப்ப‌ட்டன‌.',
  'த‌க‌வ‌ல்த‌ள‌த்தை தேர்வு செய்',
  'த‌க‌வ‌ல்த‌ள‌த்தை உருவாக்கு',
  'வேலைக‌ளின் ப‌ட்டி',
  'மாறிலிக‌ள் (Variables)',
  'நிக‌ழ்நிலை (Status)',
  '%s ப‌திப்பு: %s through PHP extension %s',
  'ப‌ய‌னாளர்: %s',
  'புதுப்பி (Refresh)',
  'கொலேச‌ன்',
  'அட்ட‌வ‌ணை',
  'Size',
  'Compute',
  'Selected',
  'நீக்கு',
  'Loaded plugins',
  'screenshot',
  'Materialized view',
  'தோற்றம்',
  'அட்ட‌வ‌ணை',
  'Inherits from',
  'அக‌வ‌ரிசைக‌ள் (Index) ',
  'அக‌வ‌ரிசையை (Index) மாற்று',
  'மூல‌ம்',
  'இல‌க்கு',
  'மாற்று',
  'வேற்று விசை சேர்க்க‌வும்',
  'Checks',
  'Create check',
  'தூண்டுத‌ல்க‌ள்',
  'தூண்டு விசையை சேர்',
  'Inherited by',
  'நிரந்தர இணைப்பு',
  'வெளியீடு',
  'ஃபார்ம‌ட் (Format)',
  'த‌க‌வ‌ல்',
  'ப‌ய‌னாள‌ரை உருவாக்கு',
  'ATTACH queries are not supported.',
  'வின‌வ‌லில் த‌வ‌றுள்ள‌து',
  '%d / ',
  [
    '%d வ‌ரிசை',
    '%d வ‌ரிசைக‌ள்',
  ],
  [
    'வின‌வ‌ல் செய‌ல்ப‌டுத்த‌ப்ப‌ட்ட‌து, %d வ‌ரிசை மாற்ற‌ப்ப‌ட்ட‌து.',
    'வின‌வ‌ல் செய‌ல்ப‌டுத்த‌ப்ப‌ட்ட‌து, %d வ‌ரிசைக‌ள் மாற்றப்ப‌ட்ட‌ன‌.',
  ],
  'செய‌ல் ப‌டுத்த‌ எந்த‌ க‌ட்ட‌ளைக‌ளும் இல்லை.',
  [
    '%d வின‌வ‌ல் செய‌ல்ப‌டுத்த‌ப்ப‌ட்ட‌து.',
    '%d வின‌வ‌ல்க‌ள் செய‌ல்ப‌டுத்த‌ப்ப‌ட்ட‌ன‌.',
  ],
  'செய‌ல்ப‌டுத்து',
  'Limit rows',
  'கோப்பை மேலேற்று (upload) ',
  'செர்வ‌ரில் இருந்து',
  'வெப் ச‌ர்வ‌ர் கோப்பு %s',
  'கோப்பினை இய‌க்க‌வும்',
  'பிழை ஏற்ப‌டின் நிற்க‌',
  'பிழைக‌ளை ம‌ட்டும் காண்பிக்க‌வும்',
  'வ‌ர‌லாறு',
  'துடை (Clear)',
  'அனைத்தையும் தொகு',
  'உருப்படி நீக்க‌ப்ப‌ட்ட‌து.',
  'உருப்ப‌டி புதுப்பிக்க‌ப்ப‌ட்ட‌து.',
  'உருப்ப‌டி (Item%s) சேர்க்க‌ப்ப‌ட்ட‌து.',
  'அட்ட‌வ‌ணை நீக்க‌ப்ப‌ட்ட‌து.',
  'அட்ட‌வணை மாற்ற‌ப்ப‌ட்ட‌து.',
  'அட்ட‌வ‌ணை உருவாக்க‌ப்ப‌ட்ட‌து.',
  'அட்ட‌வ‌ணைப் பெய‌ர்',
  'எஞ்சின்',
  'உள்ளிருக்கும் (Default) ம‌திப்புக‌ள் ',
  'Drop %s?',
  'பிரித்த‌து',
  'பிரிவுக‌ள்',
  'பிரிவின் பெய‌ர்',
  'ம‌திப்புக‌ள்',
  'அக‌வ‌ரிசைக‌ள் (Indexes) மாற்ற‌ப்பட்ட‌து.',
  'அக‌வ‌ரிசை வ‌கை (Index Type)',
  'Algorithm',
  'Columns',
  'நீள‌ம்',
  'பெய‌ர்',
  'Condition',
  'த‌க‌வ‌ல்த‌ள‌ம் நீக்க‌ப்ப‌ட்ட‌து.',
  'த‌க‌வ‌ல்த‌ள‌ம் பெய‌ர் மாற்ற‌ப்ப‌ட்ட‌து.',
  'த‌க‌வ‌ல்த‌ள‌ம் உருவாக்க‌ப்ப‌ட்ட‌து.',
  'த‌க‌வ‌ல்த‌ள‌ம் மாற்ற‌ப்ப‌ட்ட‌து.',
  'அழை',
  [
    'ரொட்டீன்க‌ள் அழைக்க‌ப்பட்டுள்ள‌ன‌, %d வ‌ரிசை மாற்ற‌ம் அடைந்த‌து.',
    'ரொட்டீன்க‌ள் அழைக்க‌ப்ப‌ட்டுள்ள‌ன‌, %d வ‌ரிசைக‌ள் மாற்றம் அடைந்துள்ள‌ன‌.',
  ],
  'வேற்று விசை நீக்க‌ப்ப‌ட்ட‌து.',
  'வேற்று விசை மாற்ற‌ப்ப‌ட்ட‌து.',
  'வேற்று விசை உருவாக்க‌ப்ப‌ட்ட‌து.',
  'இல‌க்கு நெடுவ‌ரிசையில் அக‌வ‌ரிசை (Index) ம‌ற்றும் குறிக்க‌ப்ப‌ட்ட‌ த‌க‌வல் (Referenced DATA) க‌ண்டிப்பாக‌ இருத்த‌ல் வேண்டும். மூல‌ நெடுவ‌ரிசை ம‌ற்றும் இலக்கு நெடுவ‌ரிசையின் த‌க‌வ‌ல் வ‌டிவ‌ம் (DATA TYPE) ஒன்றாக‌ இருக்க‌ வேண்டும்.',
  'வேற்று விசை',
  'அட்ட‌வ‌ணை இல‌க்கு',
  'மாற்று',
  'நெடு வ‌ரிசையை சேர்க்க‌வும்',
  'தோற்றம் மாற்றப்ப‌ட்ட‌து.',
  'தோற்ற‌ம் நீக்க‌ப்ப‌ட்ட‌து.',
  'தோற்ற‌ம் உருவாக்க‌ப்ப‌ட்ட‌து.',
  'தோற்றத்தை உருவாக்கு',
  'நிக‌ழ்ச்சி (Event) நீக்க‌ப்ப‌ட்ட‌து.',
  'நிக‌ழ்ச்சி (Event) மாற்றப்ப‌ட்ட‌து.',
  'நிக‌ழ்ச்சி (Event) உருவாக்க‌‌ப்ப‌ட்ட‌து.',
  'நிக‌ழ்ச்சியை (Event) மாற்று',
  'நிக‌ழ்ச்சியை (Event) உருவாக்கு',
  'தொட‌ங்கு',
  'முடி (வு)',
  'ஒவ்வொரு',
  'முடிந்த‌தின் பின் பாதுகாக்க‌வும்',
  'ரொட்டீன் நீக்க‌ப்ப‌ட்ட‌து.',
  'ரொட்டீன் மாற்ற‌ப்ப‌ட்டது.',
  'ரொட்டீன் உருவாக்க‌ப்ப‌ட்ட‌து.',
  'Function மாற்று',
  'செய‌ல்முறையை மாற்று',
  'Function உருவாக்கு',
  'செய்முறையை உருவாக்கு',
  'திரும்பு வ‌கை',
  'Check has been dropped.',
  'Check has been altered.',
  'Check has been created.',
  'Alter check',
  'தூண்டு விசை நீக்க‌ப்ப‌ட்ட‌து.',
  'தூண்டு விசை மாற்ற‌ப்ப‌ட்ட‌து.',
  'தூண்டு விசை உருவாக்க‌ப்ப‌ட்ட‌து.',
  'தூண்டு விசையை மாற்று',
  'தூண்டு விசையை உருவாக்கு',
  'நேர‌ம்',
  'நிக‌ழ்ச்சி',
  'ப‌யனீட்டாள‌ர் நீக்க‌ப்ப‌ட்டார்.',
  'ப‌யனீட்டாள‌ர் மாற்றப்ப‌ட்டார்.',
  'ப‌ய‌னீட்டாள‌ர் உருவாக்க‌ப்ப‌ட்ட‌து.',
  'Hashed',
  'ரொட்டீன்',
  'அனும‌திய‌ளி',
  'இர‌த்துச்செய்',
  [
    '%d வேலை வ‌லுவில் நிறுத்த‌ப‌ட்ட‌து.',
    '%d வேலைக‌ள் வ‌லுவில் நிறுத்த‌ப‌ட்ட‌ன‌.',
  ],
  'ந‌க‌லி (Clone)',
  'மொத்தம் %d ',
  'வ‌லுவில் நிறுத்து',
  [
    '%d உருப்ப‌டி மாற்ற‌ம‌டைந்தது.',
    '%d உருப்ப‌டிக‌ள் மாற்ற‌ம‌டைந்த‌ன‌.',
  ],
  'Ctrl+click on a value to modify it.',
  'File must be in UTF-8 encoding.',
  [
    '%d வ‌ரிசை இற‌க்கும‌தி (Import) செய்ய‌ப்ப‌ட்ட‌து.',
    '%d வ‌ரிசைக‌ள் இற‌க்கும‌தி (Import) செய்ய‌ப்ப‌ட்டன‌.',
  ],
  'அட்ட‌வ‌ணையை தேர்வு செய்ய‌ முடிய‌வில்லை',
  'Modify',
  'உற‌வுக‌ள் (Relations)',
  'தொகு',
  'இந்த‌ ம‌திப்பினை மாற்ற‌, தொகுப்பு இணைப்பினை உப‌யோகிக்க‌வும்.',
  'Load more data',
  'Loading',
  'ப‌க்க‌ம்',
  'க‌டைசி',
  'முழுமையான‌ முடிவு',
  'அட்ட‌வ‌ணை குறைக்க‌ப்ப‌ட்ட‌து (truncated).',
  'அட்ட‌வ‌ணை ந‌க‌ர்த்த‌ப்ப‌ட்ட‌து.',
  'அட்டவணைகள் நகலெடுக்கப் பட்டது.',
  'அட்ட‌வ‌ணை நீக்க‌ப்ப‌ட்ட‌து.',
  'Tables have been optimized.',
  'அமைப்புமுறை',
  'அட்ட‌வ‌ணைக‌ளும் பார்வைக‌ளும்',
  'த‌க‌வ‌லை அட்ட‌வ‌ணையில் தேடு',
  'எஞ்சின் (Engine)',
  'த‌க‌வ‌ல் நீள‌ம்',
  'Index நீள‌ம்',
  'Data Free',
  'வ‌ரிசைக‌ள்',
  'Vacuum',
  'உக‌ப்பாக்கு (Optimize)',
  'ப‌ரிசோதி',
  'நுணுகி ஆராய‌வும்',
  'ப‌ழுது பார்',
  'குறை (Truncate)',
  'ம‌ற்ற‌ த‌க‌வ‌ல் தள‌த்திற்க்கு ந‌க‌ர்த்து',
  'ந‌க‌ர்த்து',
  'நகல்',
  'overwrite',
  'கால‌ அட்ட‌வ‌ணை',
  'குறித்த‌ நேர‌த்தில்',
  'HH:MM:SS',
];
		case "th": return [
  '%.3f วินาที',
  'ไม่สามารถอัปโหลดไฟล์ได้.',
  'ขนาดไฟล์สูงสุดที่อนุญาตให้ใช้งานคือ %sB.',
  'ไม่มีไฟล์.',
  ' ',
  '0123456789',
  'ประเภทผู้ใช้งาน',
  'คุณแน่ใจแล้วหรือ',
  'Increase %s.',
  'การอัปโหลดไฟล์ถูกปิดการใช้งาน.',
  'ต้นฉบับ',
  'ไม่พบตาราง.',
  'แก้ไข',
  'เพิ่ม',
  'ไม่มีแถวของตาราง.',
  'You have no privileges to update this table.',
  'บันทึก',
  'บันทึกและแก้ไขข้อมูลอื่นๆต่อ',
  'บันทึกแล้วเพิ่มรายการถัดไป',
  'Saving',
  'ลบ',
  'ภาษา',
  'ใช้งาน',
  'Unknown error.',
  'ระบบ',
  'เซอเวอร์',
  'hostname[:port] or :socket',
  'ชื่อผู้ใช้งาน',
  'รหัสผ่าน',
  'ฐานข้อมูล',
  'เข้าสู่ระบบ',
  'จดจำการเข้าสู่ระบบตลอดไป',
  'Adminer does not support accessing a database without a password, <a href="https://www.adminer.org/en/password/"%s>more information</a>.',
  'เลือกข้อมูล',
  'แสดงโครงสร้าง',
  'เปลี่ยนแปลงวิว',
  'เปลี่ยนแปลงตารางแล้ว',
  'รายการใหม่',
  'Warnings',
  '%d ไบท์',
  'คอลัมน์',
  'ชนิด',
  'หมายเหตุ',
  'เพิ่มลำดับโดยอัตโนมัติ',
  'Default value',
  'เลือก',
  'ฟังก์ชั่น',
  'รวบรวม',
  'ค้นหา',
  'ทุกแห่ง',
  'เรียงลำดับ',
  'มากไปน้อย',
  'จำกัด',
  'ความยาวของอักษร',
  'ดำเนินการ',
  'Full table scan',
  'คำสั่ง SQL',
  'เปิด',
  'บันทึก',
  'เปลี่ยนแปลงฐานข้อมูล',
  'เปลี่ยนแปลง schema',
  'สร้าง schema',
  'Schema ของฐานข้อมูล',
  'สิทธิ์',
  'รูทีน',
  'Sequences',
  'เหตุการณ์',
  'นำเข้า',
  'ส่งออก',
  'สร้างตารางใหม่',
  'DB',
  'เลือก',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  'Disable %s or enable %s or %s extensions.',
  'ตัวเลข',
  'วันและเวลา',
  'ตัวอักษร',
  'รายการ',
  'เลขฐานสอง',
  'เรขาคณิต',
  'ltr',
  'You are offline.',
  'ออกจากระบบ',
  'Too many unsuccessful logins, try again in %d minute(s).',
  'ออกจากระบบเรียบร้อยแล้ว.',
  'Thanks for using Adminer, consider <a href="https://www.adminer.org/en/donation/">donating</a>.',
  'Session หมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่อีกครั้ง.',
  'Master password expired. <a href="https://www.adminer.org/en/extension/"%s>Implement</a> %s method to make it permanent.',
  'ต้องเปิดใช้งาน Session.',
  'The action will be performed after successful login with the same credentials.',
  'ไม่พบส่วนเสริม',
  'ไม่มีส่วนเสริมของ PHP (%s) ที่สามารถใช้งานได้.',
  'Connecting to privileged ports is not allowed.',
  'ข้อมูลไม่ถูกต้อง.',
  'There is a space in the input password which might be the cause.',
  'เครื่องหมาย CSRF ไม่ถูกต้อง ส่งข้อมูลใหม่อีกครั้ง.',
  'จำนวนสูงสุดของฟิลด์อนุญาตให้เกิน กรุณาเพิ่มอีก %s.',
  'If you did not send this request from Adminer then close this page.',
  'ข้อมูลที่ส่งเข้ามีขนาดใหญ่เกิน คุณสามารถ เพิ่ม-ลดขนาดได้ที่ %s คำสั่งการตั้งค่า.',
  'You can upload a big SQL file via FTP and import it from server.',
  'คีย์คู่แข่ง',
  'การตรวจทาน',
  'ON UPDATE',
  'ON DELETE',
  'ชื่อคอลัมน์',
  'ชื่อพารามิเตอร์',
  'ความยาว',
  'ตัวเลือก',
  'เพิ่มรายการถัดไป',
  'ย้ายไปข้างบน',
  'ย้ายลงล่าง',
  'ลบ',
  'ฐานข้อมูลไม่ถูกต้อง.',
  'ฐานข้อมูลถูกลบแล้ว.',
  'เลือกฐานข้อมูล',
  'สร้างฐานข้อมูล',
  'รายการของกระบวนการ',
  'ตัวแปร',
  'สถานะ',
  '%s รุ่น: %s ผ่านส่วนขยาย PHP %s',
  'สวัสดีคุณ: %s',
  'โหลดใหม่',
  'การตรวจทาน',
  'ตาราง',
  'Size',
  'Compute',
  'Selected',
  'ลบ',
  'Loaded plugins',
  'screenshot',
  'Materialized view',
  'วิว',
  'ตาราง',
  'Inherits from',
  'ดัชนี',
  'เปลี่ยนแปลงดัชนี',
  'แหล่งข้อมูล',
  'เป้าหมาย',
  'เปลี่ยนแปลง',
  'เพิ่มคีย์คู่แข่ง',
  'Checks',
  'Create check',
  'ทริกเกอร์',
  'เพิ่ม trigger',
  'Inherited by',
  'ลิงค์ถาวร',
  'ข้อมูลที่ส่งออก',
  'รูปแบบ',
  'ข้อมูล',
  'สร้างผู้ใช้งาน',
  'ATTACH queries are not supported.',
  'คำสั่งไม่ถูกต้อง',
  '%d / ',
  '%d แถว',
  'ประมวลผลคำสั่งแล้ว มี %d ถูกดำเนินการ.',
  'ไม่มีคำสั่งที่จะประมวลผล.',
  '%d คำสั่งถูกดำเนินการแล้ว.',
  'ประมวลผล',
  'Limit rows',
  'อัปโหลดไฟล์',
  'จากเซเวอร์',
  'Webserver file %s',
  'ทำงานจากไฟล์',
  'หยุดการทำงานเมื่อเออเรอ',
  'แสดงเฉพาะเออเรอ',
  'ประวัติ',
  'เคลียร์',
  'แก้ไขทั้งหมด',
  'รายการถูกลบแล้ว.',
  'ปรับปรุงรายการแล้ว.',
  'มี%s รายการ ถูกเพิ่มแล้ว.',
  'ลบตารางแล้ว.',
  'แก้ไขตารางแล้ว.',
  'สร้างตารางใหม่แล้ว.',
  'ชื่อตาราง',
  'ชนิดของฐานข้อมูล',
  'ค่าเริ่มต้น',
  'Drop %s?',
  'พาร์ทิชันโดย',
  'พาร์ทิชัน',
  'ชื่อของพาร์ทิชัน',
  'ค่า',
  'เปลี่ยนแปลงดัชนีแล้ว.',
  'ชนิดของดัชนี',
  'Algorithm',
  'Columns',
  'ความยาว',
  'ชื่อ',
  'Condition',
  'ฐานข้อมูลถูกลบแล้ว.',
  'เปลี่ยนชื่อฐานข้อมูลแล้ว.',
  'สร้างฐานข้อมูลใหม่แล้ว.',
  'เปลี่ยนแปลงฐานข้อมูลแล้ว.',
  'เรียกใช้งาน',
  'รูทีนถูกเรียกใช้งาน มี %d แถวถูกดำเนินการ.',
  'คีย์คู่แข่งถูกลบแล้ว.',
  'คีย์คู่แข่งถูกเปลี่ยนแปลงแล้ว.',
  'คีย์คู่แข่งถูกสร้างแล้ว.',
  'แหล่งที่มาและเป้าหมายของคอลมัน์ต้องมีชนิดข้อมูลเดียวกัน คือต้องมีดัชนีและข้อมูลอ้างอิงของคอลัมน์เป้าหมาย.',
  'คีย์คู่แข่ง',
  'คารางเป้าหมาย',
  'แก้ไข',
  'เพิ่มคอลัมน์',
  'วิวถูกเปลี่ยนแปลงแล้ว.',
  'วิวถูกลบแล้ว.',
  'วิวถูกสร้างแล้ว.',
  'เพิ่มวิว',
  'เหตุการณ์ถูกลบแล้ว.',
  'เหตุการณ์ถูกเปลี่ยนแปลงแล้ว.',
  'เหตุการณ์ถูกสร้างแล้ว.',
  'เปลี่ยนแปลงเหตุการณ์',
  'สร้างเหตุการณ์',
  'เริ่มต้น',
  'สิ้นสุด',
  'ทุกๆ',
  'เมื่อเสร็จสิ้นการสงวน',
  'Routine ถูกลบแล้ว.',
  'Routine ถูกเปลี่ยนแปลงแล้ว.',
  'Routine ถูกสร้างแล้ว.',
  'เปลี่ยนแปลง Function',
  'เปลี่ยนแปลง procedure',
  'สร้าง Function',
  'สร้าง procedure',
  'ประเภทของค่าที่คืนกลับ',
  'Check has been dropped.',
  'Check has been altered.',
  'Check has been created.',
  'Alter check',
  'Trigger ถูกลบแล้ว.',
  'Trigger ถูกเปลี่ยนแปลงแล้ว.',
  'Trigger ถูกสร้างแล้ว.',
  'เปลี่ยนแปลง Trigger',
  'สร้าง Trigger',
  'เวลา',
  'เหตุการณ์',
  'ลบผู้ใช้งานแล้ว.',
  'เปลี่ยนแปลงผู้ใช้งานแล้ว.',
  'สร้างผู้ใช้งานแล้ว.',
  'Hash',
  'รูทีน',
  'การอนุญาต',
  'ยกเลิก',
  'มี %d กระบวนการถูกทำลายแล้ว.',
  'ทำซ้ำ',
  '%d ของทั้งหมด',
  'ทำลาย',
  'มี %d รายการถูกดำเนินการแล้ว.',
  'กด Ctrl+click เพื่อแก้ไขค่า.',
  'File must be in UTF-8 encoding.',
  '%d แถวถูกนำเข้าแล้ว.',
  'ไม่สามารถเลือกตารางได้',
  'Modify',
  'ความสำพันธ์',
  'แก้ไข',
  'ใช้ลิงค์ แก้ไข เพื่อปรับเปลี่ยนค่านี้.',
  'Load more data',
  'Loading',
  'หน้า',
  'ล่าสุด',
  'รวมผล',
  'เคลียร์ตารางแล้ว (truncate).',
  'ตารางถูกย้ายแล้ว.',
  'ทำซ้ำตารางฐานข้อมูลแล้ว.',
  'ตารางถูกลบแล้ว.',
  'Tables have been optimized.',
  'Schema',
  'ตารางและวิว',
  'ค้นหาในตาราง',
  'ชนิดของฐานข้อมูล',
  'ความยาวของข้อมูล',
  'ความยาวของดัชนี',
  'พื้นที่ว่าง',
  'แถว',
  'Vacuum',
  'เพิ่มประสิทธิภาพ',
  'ตรวจสอบ',
  'วิเคราะห์',
  'ซ่อมแซม',
  'ตัดทิ้ง',
  'ย้ายไปยังฐานข้อมูลอื่น',
  'ย้าย',
  'ทำซ้ำ',
  'overwrite',
  'กำหนดการณ์',
  'ในเวลาที่กำหนด',
  'HH:MM:SS',
];
		case "tr": return [
  '%.3f s',
  'Dosya gönderilemiyor.',
  'İzin verilen dosya boyutu sınırı %sB.',
  'Dosya mevcut değil.',
  ' ',
  '0123456789',
  'Kullanıcı türleri',
  'Emin misiniz?',
  'Increase %s.',
  'Dosya gönderimi etkin değil.',
  'orijinal',
  'Tablo yok.',
  'Düzenle',
  'Ekle',
  'Kayıt yok.',
  'Bu tabloyu güncellemek için yetkiniz yok.',
  'Kaydet',
  'Kaydet ve düzenlemeye devam et',
  'Kaydet ve sonrakini ekle',
  'Saydediliyor',
  'Sil',
  'Dil',
  'Kullan',
  'Unknown error.',
  'Sistem',
  'Sunucu',
  'hostname[:port] or :socket',
  'Kullanıcı',
  'Parola',
  'Veri Tabanı',
  'Giriş',
  'Beni hatırla',
  'Adminer does not support accessing a database without a password, <a href="https://www.adminer.org/en/password/"%s>more information</a>.',
  'Veri seç',
  'Yapıyı göster',
  'Görünümü değiştir',
  'Tabloyu değiştir',
  'Yeni kayıt',
  'Uyarılar',
  [
    '%d bayt',
    '%d bayt',
  ],
  'Kolon',
  'Tür',
  'Yorum',
  'Otomatik Artır',
  'Varsayılan değer',
  'Seç',
  'Fonksiyonlar',
  'Kümeleme',
  'Ara',
  'hiçbir yerde',
  'Sırala',
  'Azalan',
  'Limit',
  'Metin Boyutu',
  'İşlem',
  'Tam tablo taraması',
  'SQL komutu',
  'aç',
  'kaydet',
  'Veri tabanını değiştir',
  'Şemayı değiştir',
  'Şema oluştur',
  'Veri tabanı şeması',
  'İzinler',
  'Yordamlar',
  'Diziler',
  'Olaylar',
  'İçeri Aktar',
  'Dışarı Aktar',
  'Tablo oluştur',
  'DB',
  'seç',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  'Disable %s or enable %s or %s extensions.',
  'Sayılar',
  'Tarih ve zaman',
  'Dizge',
  'Listeler',
  'İkili',
  'Geometri',
  'ltr',
  'Çevrimdışısınız.',
  'Çıkış',
  [
    'Çok fazla oturum açma denemesi yapıldı.',
    '%d Dakika sonra tekrar deneyiniz.',
  ],
  'Oturum başarıyla sonlandı.',
  'Adminer kullandığınız için teşekkür ederiz <a href="https://www.adminer.org/en/donation/">bağış yapmayı düşünün</a>.',
  'Oturum süresi doldu, lütfen tekrar giriş yapın.',
  'Ana şifrenin süresi doldu. Kalıcı olması için <a href="https://www.adminer.org/en/extension/"%s>%s medodunu</a> kullanın.',
  'Oturum desteği etkin olmalıdır.',
  'İşlem, aynı kimlik bilgileriyle başarıyla oturum açıldıktan sonra gerçekleştirilecektir.',
  'Uzantı yok',
  'Desteklenen PHP eklentilerinden (%s) hiçbiri mevcut değil.',
  'Ayrıcalıklı bağlantı noktalarına bağlanmaya izin verilmiyor.',
  'Geçersiz kimlik bilgileri.',
  'There is a space in the input password which might be the cause.',
  'Geçersiz (CSRF) jetonu. Formu tekrar yolla.',
  'İzin verilen en fazla alan sayısı aşıldı. Lütfen %s değerlerini artırın.',
  'Bu isteği Adminer\'den göndermediyseniz bu sayfayı kapatın.',
  'Çok büyük POST verisi, veriyi azaltın ya da %s ayar yönergesini uygun olarak yapılandırın.',
  'FTP yoluyla büyük bir SQL dosyası yükleyebilir ve sunucudan içe aktarabilirsiniz.',
  'Dış anahtarlar',
  'karşılaştırma',
  'ON UPDATE (Hedefteki Kayıt Değiştirilirse)',
  'ON DELETE (Hedefteki Kayıt Silinirse)',
  'Kolon adı',
  'Parametre adı',
  'Uzunluk',
  'Seçenekler',
  'Bundan sonra ekle',
  'Yukarı taşı',
  'Aşağı taşı',
  'Sil',
  'Geçersiz veri tabanı.',
  'Veritabanları silindi.',
  'Veri tabanı seç',
  'Veri tabanı oluştur',
  'İşlem listesi',
  'Değişkenler',
  'Durum',
  '%s sürüm: %s, %s PHP eklentisi ile',
  '%s olarak giriş yapıldı.',
  'Tazele',
  'Karşılaştırma',
  'Tablolar',
  'Boyut',
  'Hesapla',
  'Seçildi',
  'Sil',
  'Loaded plugins',
  'screenshot',
  'Materialized Görünüm',
  'Görünüm',
  'Tablo',
  'Inherits from',
  'İndeksler',
  'İndeksleri değiştir',
  'Kaynak',
  'Hedef',
  'Değiştir',
  'Dış anahtar ekle',
  'Checks',
  'Create check',
  'Tetikler',
  'Tetik ekle',
  'Inherited by',
  'Kalıcı bağlantı',
  'Çıktı',
  'Biçim',
  'Veri',
  'Kullanıcı oluştur',
  'ATTACH sorguları desteklenmiyor.',
  'Sorguda hata',
  '%d / ',
  [
    '%d kayıt',
    '%d adet kayıt',
  ],
  [
    'Sorgu başarıyla çalıştırıldı, %d adet kayıt etkilendi.',
    'Sorgu başarıyla çalıştırıldı, %d adet kayıt etkilendi.',
  ],
  'Çalıştırılacak komut yok.',
  [
    '%d sorgu başarıyla çalıştırıldı.',
    '%d adet sorgu başarıyla çalıştırıldı.',
  ],
  'Çalıştır',
  'Satır Limiti',
  'Dosya gönder',
  'Sunucudan',
  '%s web sunucusu dosyası',
  'Dosyayı çalıştır',
  'Hata oluşursa dur',
  'Sadece hataları göster',
  'Geçmiş',
  'Temizle',
  'Tümünü düzenle',
  'Kayıt silindi.',
  'Kayıt güncellendi.',
  'Kayıt%s eklendi.',
  'Tablo silindi.',
  'Tablo değiştirildi.',
  'Tablo oluşturuldu.',
  'Tablo adı',
  'motor',
  'Varsayılan değerler',
  'Sil %s?',
  'Bununla bölümle',
  'Bölümler',
  'Bölüm adı',
  'Değerler',
  'İndeksler değiştirildi.',
  'İndex Türü',
  'Algorithm',
  'Columns',
  'uzunluğu',
  'Ad',
  'Condition',
  'Veri tabanı silindi.',
  'Veri tabanının ismi değiştirildi.',
  'Veri tabanı oluşturuldu.',
  'Veri tabanı değiştirildi.',
  'Çağır',
  [
    'Yordam çağrıldı, %d adet kayıt etkilendi.',
    'Yordam çağrıldı, %d kayıt etkilendi.',
  ],
  'Dış anahtar silindi.',
  'Dış anahtar değiştirildi.',
  'Dış anahtar oluşturuldu.',
  'Kaynak ve hedef kolonlar aynı veri türünde olmalı, hedef kolonlarda dizin bulunmalı ve başvurulan veri mevcut olmalı.',
  'Dış anahtar',
  'Hedef tablo',
  'Değiştir',
  'Kolon ekle',
  'Görünüm değiştirildi.',
  'Görünüm silindi.',
  'Görünüm oluşturuldu.',
  'Görünüm oluştur',
  'Olay silindi.',
  'Olay değiştirildi.',
  'Olay oluşturuldu.',
  'Olayı değiştir',
  'Olay oluştur',
  'Başla',
  'Son',
  'Her zaman',
  'Tamamlama koruması',
  'Yordam silindi.',
  'Yordam değiştirildi.',
  'Yordam oluşturuldu.',
  'Fonksyionu değiştir',
  'Yöntemi değiştir',
  'Fonksiyon oluştur',
  'Yöntem oluştur',
  'Geri dönüş türü',
  'Check has been dropped.',
  'Check has been altered.',
  'Check has been created.',
  'Alter check',
  'Tetik silindi.',
  'Tetik değiştirildi.',
  'Tetik oluşturuldu.',
  'Tetiği değiştir',
  'Tetik oluştur',
  'Zaman',
  'Olay',
  'Kullanıcı silindi.',
  'Kullanıcı değiştirildi.',
  'Kullanıcı oluşturuldu.',
  'Harmanlandı',
  'Yordam',
  'Yetki Ver',
  'Yetki Kaldır',
  [
    '%d işlem sonlandırıldı.',
    '%d adet işlem sonlandırıldı.',
  ],
  'Kopyala',
  'toplam %d',
  'Sonlandır',
  [
    '%d kayıt etkilendi.',
    '%d adet kayıt etkilendi.',
  ],
  'Bir değeri değiştirmek için üzerine Ctrl+tıklayın.',
  'Dosya UTF-8 kodlamasında olmalıdır.',
  [
    '%d kayıt içeri aktarıldı.',
    '%d adet kayıt içeri aktarıldı.',
  ],
  'Tablo seçilemedi',
  'Düzenle',
  'İlişkiler',
  'düzenle',
  'Değeri değiştirmek için düzenleme bağlantısını kullanın.',
  'Daha fazla veri yükle',
  'Yükleniyor',
  'Sayfa',
  'son',
  'Tüm sonuç',
  'Tablolar boşaltıldı.',
  'Tablolar taşındı.',
  'Tablolar kopyalandı.',
  'Tablolar silindi.',
  'Tablolar en uygun hale getirildi.',
  'Şema',
  'Tablolar ve görünümler',
  'Tablolarda veri ara',
  'Motor',
  'Veri Uzunluğu',
  'İndex Uzunluğu',
  'Boş Veri',
  'Kayıtlar',
  'Vakumla',
  'Optimize Et',
  'Denetle',
  'Çözümle',
  'Tamir Et',
  'Boşalt',
  'Başka veri tabanına taşı',
  'Taşı',
  'Kopyala',
  'overwrite',
  'Takvimli',
  'Verilen zamanda',
  'Türü değiştir',
];
		case "uk": return [
  '%.3f s',
  'Неможливо завантажити файл.',
  'Максимально допустимий розмір файлу %sБ.',
  'Файл не існує.',
  ' ',
  '0123456789',
  'Типи користувачів',
  'Ви впевнені?',
  'Increase %s.',
  'Завантаження файлів заборонене.',
  'початковий',
  'Нема таблиць.',
  'Редагувати',
  'Вставити',
  'Нема рядків.',
  'Ви не маєте привілеїв для оновлення цієї таблиці.',
  'Зберегти',
  'Зберегти і продовжити редагування',
  'Зберегти і вставити знову',
  'Збереження',
  'Видалити',
  'Мова',
  'Обрати',
  'Невідома помилка.',
  'Система Бази Даних',
  'Сервер',
  'hostname[:port] or :socket',
  'Користувач',
  'Пароль',
  'База даних',
  'Увійти',
  'Пам\'ятати сесію',
  'Adminer не підтримує доступ до бази даних без пароля, <a href="https://www.adminer.org/en/password/"%s>більше інформації</a>.',
  'Вибрати дані',
  'Показати структуру',
  'Змінити вигляд',
  'Змінити таблицю',
  'Новий запис',
  'Попередження',
  [
    '%d байт',
    '%d байта',
    '%d байтів',
  ],
  'Колонка',
  'Тип',
  'Коментарі',
  'Автоматичне збільшення',
  'Значення за замовчуванням',
  'Вибрати',
  'Функції',
  'Агрегація',
  'Пошук',
  'будь-де',
  'Сортувати',
  'по спаданню',
  'Обмеження',
  'Довжина тексту',
  'Дія',
  'Повне сканування таблиці',
  'SQL запит',
  'відкрити',
  'зберегти',
  'Змінити базу даних',
  'Змінити схему',
  'Створити схему',
  'Схема бази даних',
  'Привілеї',
  'Збережені процедури',
  'Послідовності',
  'Події',
  'Імпортувати',
  'Експорт',
  'Створити таблицю',
  'DB',
  'вибрати',
  '%s має <a%s>повернути масив</a>.',
  '<a%s>Налаштувати</a> %s у %s.',
  'Вимкніть %s або увімкніть розширення %s або %s.',
  'Числа',
  'Дата і час',
  'Рядки',
  'Списки',
  'Двійкові',
  'Геометрія',
  'ltr',
  'Ви офлайн.',
  'Вийти',
  [
    'Занадто багато невдалих спроб входу. Спробуйте знову через %d хвилину.',
    'Занадто багато невдалих спроб входу. Спробуйте знову через %d хвилини.',
    'Занадто багато невдалих спроб входу. Спробуйте знову через %d хвилин.',
  ],
  'Ви вдало вийшли з системи.',
  'Дякуємо, що користуєтесь Adminer, подумайте про <a href="https://www.adminer.org/en/donation/">внесок</a>.',
  'Сесія закінчилась, будь ласка, увійдіть в систему знову.',
  'Термін дії майстер пароля минув. <a href="https://www.adminer.org/en/extension/"%s>Реалізуйте</a> метод %s, щоб зробити його постійним.',
  'Сесії повинні бути дозволені.',
  'Дія буде виконуватися після успішного входу в систему з тими ж обліковими даними.',
  'Нема розширень',
  'Жодне з PHP-розширень (%s), що підтримуються, не доступне.',
  'Підключення до привілейованих портів заборонено.',
  'Неправильні дані входу.',
  'У вхідному паролі є пробіл, який може бути причиною.',
  'Недійсний CSRF токен. Надішліть форму ще раз.',
  'Досягнута максимальна кількість доступних полів. Будь ласка, збільшіть %s.',
  'Якщо ви не посилали цей запит з Adminer, закрийте цю сторінку.',
  'Занадто великий об\'єм POST-даних. Зменшіть об\'єм або збільшіть параметр директиви %s конфигурації.',
  'Ви можете завантажити великий файл SQL через FTP та імпортувати його з сервера.',
  'Зовнішні ключі',
  'співставлення',
  'ПРИ ЗМІНІ',
  'ПРИ ВИДАЛЕННІ',
  'Назва стовпця',
  'Назва параметра',
  'Довжина',
  'Опції',
  'Додати ще',
  'Пересунути вгору',
  'Пересунути вниз',
  'Видалити',
  'Погана база даних.',
  'Бази даних були видалені.',
  'Обрати базу даних',
  'Створити базу даних',
  'Перелік процесів',
  'Змінні',
  'Статус',
  'Версія %s: %s з PHP-розширенням %s',
  'Ви увійшли як: %s',
  'Оновити',
  'Співставлення',
  'Таблиці',
  'Розмір',
  'Обчислити',
  'Вибрані',
  'Видалити',
  'Завантажені плагіни',
  'screenshot',
  'Матеріалізований вигляд',
  'Вигляд',
  'Таблиця',
  'Inherits from',
  'Індекси',
  'Змінити індексування',
  'Джерело',
  'Ціль',
  'Змінити',
  'Додати зовнішній ключ',
  'Перевірки',
  'Створити перевірку',
  'Тригери',
  'Додати тригер',
  'Inherited by',
  'Постійне посилання',
  'Вихідні дані',
  'Формат',
  'Дані',
  'Створити користувача',
  'ATTACH-запити не підтримуються.',
  'Помилка в запиті',
  '%d / ',
  [
    '%d рядок',
    '%d рядки',
    '%d рядків',
  ],
  [
    'Запит виконано успішно, змінено %d рядок.',
    'Запит виконано успішно, змінено %d рядки.',
    'Запит виконано успішно, змінено %d рядків.',
  ],
  'Нема запитів до виконання.',
  [
    '%d запит виконано успішно.',
    '%d запити виконано успішно.',
    '%d запитів виконано успішно.',
  ],
  'Виконати',
  'Обмеження рядків',
  'Завантажити файл',
  'З сервера',
  'Файл %s на вебсервері',
  'Запустити файл',
  'Зупинитись при помилці',
  'Показувати тільки помилки',
  'Історія',
  'Очистити',
  'Редагувати все',
  'Запис було видалено.',
  'Запис було змінено.',
  'Запис%s було вставлено.',
  'Таблицю було видалено.',
  'Таблица була змінена.',
  'Таблиця була створена.',
  'Назва таблиці',
  'рушій',
  'Значення за замовчуванням',
  'Вилучити %s?',
  'Розділити по',
  'Розділи',
  'Назва розділу',
  'Значення',
  'Індексування було змінено.',
  'Тип індексу',
  'Algorithm',
  'Columns',
  'довжина',
  'Назва',
  'Condition',
  'Базу даних було видалено.',
  'Базу даних було переіменовано.',
  'Базу даних було створено.',
  'Базу даних було змінено.',
  'Викликати',
  [
    'Була викликана процедура, %d запис було змінено.',
    'Була викликана процедура, %d записи було змінено.',
    'Була викликана процедура, %d записів було змінено.',
  ],
  'Зовнішній ключ було видалено.',
  'Зовнішній ключ було змінено.',
  'Зовнішній ключ було створено.',
  'Стовпці повинні мати той самий тип даних, цільові стовпці повинні бути проіндексовані і дані, на які посилаються повинні існувати.',
  'Зовнішній ключ',
  'Цільова таблиця',
  'Змінити',
  'Додати стовпець',
  'Вигляд було змінено.',
  'Вигляд було видалено.',
  'Вигляд було створено.',
  'Створити вигляд',
  'Подію було видалено.',
  'Подію було змінено.',
  'Подію було створено.',
  'Змінити подію',
  'Створити подію',
  'Початок',
  'Кінець',
  'Кожного',
  'Після завершення зберегти',
  'Процедуру було видалено.',
  'Процедуру було змінено.',
  'Процедуру було створено.',
  'Змінити функцію',
  'Змінити процедуру',
  'Створити функцію',
  'Створити процедуру',
  'Тип, що повернеться',
  'Перевірку видалено.',
  'Перевірка змінена.',
  'Перевірку створено.',
  'Змінити перевірку',
  'Тригер було видалено.',
  'Тригер було змінено.',
  'Тригер було створено.',
  'Змінити тригер',
  'Створити тригер',
  'Час',
  'Подія',
  'Користувача було видалено.',
  'Користувача було змінено.',
  'Користувача було створено.',
  'Хешовано',
  'Процедура',
  'Дозволити',
  'Заборонити',
  [
    'Було завершено %d процес.',
    'Було завершено %d процеси.',
    'Було завершёно %d процесів.',
  ],
  'Клонувати',
  '%d всього',
  'Завершити процес',
  [
    'Було змінено %d запис.',
    'Було змінено %d записи.',
    'Було змінено %d записів.',
  ],
  'Ctrl+клікніть на значенні щоб змінити його.',
  'Файл повинен бути в кодуванні UTF-8.',
  [
    '%d рядок було імпортовано.',
    '%d рядки було імпортовано.',
    '%d рядків було імпортовано.',
  ],
  'Неможливо вибрати таблицю',
  'Змінити',
  'Зв\'язки',
  'редагувати',
  'Використовуйте посилання щоб змінити це значення.',
  'Завантажити ще дані',
  'Завантаження',
  'Сторінка',
  'остання',
  'Весь результат',
  'Таблиці було очищено.',
  'Таблиці було перенесено.',
  'Таблиці було зкопійовано.',
  'Таблиці були видалені.',
  'Таблиці були оптимізовані.',
  'Схема',
  'Таблиці і вигляди',
  'Шукати дані в таблицях',
  'Рушій',
  'Об\'єм даних',
  'Об\'єм індексів',
  'Вільне місце',
  'Рядків',
  'Вакуум',
  'Оптимізувати',
  'Перевірити',
  'Аналізувати',
  'Виправити',
  'Очистити',
  'Перенести до іншої бази даних',
  'Перенести',
  'копіювати',
  'перезаписати',
  'Розклад',
  'В даний час',
  'База даних не підтримує пароль.',
];
		case "uz": return [
  '%.3f s',
  'Faylni yuklab bo\'lmadi.',
  'Maksimal ruxsat etilgan fayl hajmi %sB.',
  'Fayl mavjud emas.',
  ' ',
  '0123456789',
  'Foydalanuvchi turlari',
  'Ishonchingiz komilmi?',
  'Increase %s.',
  'Fayl yuklash o\'chirilgan.',
  'asl',
  'Jadvallar yo\'q.',
  'Tahrirlash',
  'Kiritish',
  'Qatorlar yo\'q.',
  'Bu jadvalni yangilash uchun sizda huquqlar yo\'q.',
  'Saqlash',
  'Saqlash va tahrirlashni davom ettirish',
  'Saqlash va keyingisini kiritish',
  'Saqlanmoqda',
  'O\'chirish',
  'Til',
  'Foydalanish',
  'Noma\'lum xatolik.',
  'Tizim',
  'Server',
  'hostname[:port] or :socket',
  'Foydalanuvchi nomi',
  'Parol',
  'Ma\'lumotlar bazasi',
  'Kirish',
  'Doimiy kirish',
  'Adminer parolsiz ma\'lumotlar bazasiga kirishni qo\'llab-quvvatlamaydi, <a href="https://www.adminer.org/en/password/"%s>ko\'proq ma\'lumot</a>.',
  'Ma\'lumotlarni tanlash',
  'Tuzilishni ko\'rsatish',
  'Ko\'rinishni o\'zgartirish',
  'Jadvalni o\'zgartirish',
  'Yangi element',
  'Ogohlantirishlar',
  [
    '%d bayt',
    '%d baytlar',
  ],
  'Ustun',
  'Tur',
  'Izoh',
  'Avto ko\'payish',
  'Standart qiymat',
  'Tanlash',
  'Funksiyalar',
  'Agregatsiya',
  'Qidirish',
  'hamma joyda',
  'Saralash',
  'kamayish bo\'yicha',
  'Cheklov',
  'Matn uzunligi',
  'Amal',
  'To\'liq jadval skanerlash',
  'SQL buyrug\'i',
  'ochish',
  'saqlash',
  'Ma\'lumotlar bazasini o\'zgartirish',
  'Sxemani o\'zgartirish',
  'Sxema yaratish',
  'Ma\'lumotlar bazasi sxemasi',
  'Imtiyozlar',
  'Protseduralar',
  'Ketma-ketliklar',
  'Hodisalar',
  'Import',
  'Eksport',
  'Jadval yaratish',
  'MB',
  'tanlash',
  '%s <a%s>massiv qaytarishi</a> kerak.',
  '%s ni %s ichida <a%s>sozlang</a>.',
  '%s ni o\'chiring yoki %s yoki %s kengaytmalarini yoqing.',
  'Raqamlar',
  'Sana va vaqt',
  'Matnlar',
  'Ro\'yxatlar',
  'Ikkilik',
  'Geometriya',
  'ltr',
  'Siz oflayndasiz.',
  'Chiqish',
  [
    'Juda ko\'p muvaffaqiyatsiz urinishlar, %d daqiqadan so\'ng qayta urining.',
    'Juda ko\'p muvaffaqiyatsiz urinishlar, %d daqiqadan so\'ng qayta urining.',
  ],
  'Muvaffaqiyatli chiqdingiz.',
  'Adminer dasturidan foydalanganingiz uchun rahmat, <a href="https://www.adminer.org/en/donation/">xayriya qilishni</a> o\'ylab ko\'ring.',
  'Sessiya muddati tugadi, iltimos, qayta kiring.',
  'Asosiy parol muddati tugadi. Uni doimiy qilish uchun %s usulini <a href="https://www.adminer.org/en/extension/"%s>amalga oshiring</a>.',
  'Sessiya qo\'llab-quvvatlashi yoqilgan bo\'lishi kerak.',
  'Amal bir xil ma\'lumotlar bilan muvaffaqiyatli kirishdan so\'ng amalga oshiriladi.',
  'Kengaytma yo\'q',
  'Qo\'llab-quvvatlanadigan PHP kengaytmalarining (%s) hech biri mavjud emas.',
  'Imtiyozli portlarga ulanishga ruxsat berilmagan.',
  'Noto\'g\'ri ma\'lumotlar.',
  'Kiritilgan parolda bo\'sh joy bor, bu sabab bo\'lishi mumkin.',
  'Noto\'g\'ri CSRF belgisi. Shaklni qayta yuboring.',
  'Ruxsat etilgan maydonlar soni oshib ketdi. Iltimos, %s ni oshiring.',
  'Agar bu so\'rovni Adminerdan yuborgan bo\'lmasangiz, ushbu sahifani yoping.',
  'Juda katta POST ma\'lumotlari. Ma\'lumotlarni kamaytiring yoki %s konfiguratsiya direktivasini oshiring.',
  'Katta SQL faylini FTP orqali yuklab, uni serverdan import qilishingiz mumkin.',
  'Tashqi kalitlar',
  'kodlash',
  'YANGILANGANDA',
  'O\'CHIRILGANDA',
  'Ustun nomi',
  'Parametr nomi',
  'Uzunlik',
  'Variantlar',
  'Keyingisini qo\'shish',
  'Yuqoriga ko\'chirish',
  'Pastga ko\'chirish',
  'Olib tashlash',
  'Noto\'g\'ri ma\'lumotlar bazasi.',
  'Ma\'lumotlar bazalari o\'chirildi.',
  'Ma\'lumotlar bazasini tanlash',
  'Ma\'lumotlar bazasini yaratish',
  'Jarayonlar ro\'yxati',
  'O\'zgaruvchilar',
  'Holat',
  '%s versiyasi: %s PHP kengaytmasi %s orqali',
  'Siz kirgansiz: %s',
  'Yangilash',
  'Kodlash',
  'Jadvallar',
  'Hajm',
  'Hisoblash',
  'Tanlangan',
  'O\'chirish',
  'Yuklangan plaginlar',
  'screenshot',
  'Moddiy ko\'rinish',
  'Ko\'rinish',
  'Jadval',
  'Inherits from',
  'Indekslar',
  'Indekslarni o\'zgartirish',
  'Manba',
  'Maqsad',
  'O\'zgartirish',
  'Tashqi kalit qo\'shish',
  'Tekshirishlar',
  'Tekshirish yaratish',
  'Triggerlar',
  'Trigger qo\'shish',
  'Inherited by',
  'Doimiy havola',
  'Natija',
  'Format',
  'Ma\'lumotlar',
  'Foydalanuvchi yaratish',
  'ATTACH so\'rovlari qo\'llab-quvvatlanmaydi.',
  'So\'rovda xatolik',
  '%d / ',
  [
    '%d qator',
    '%d qatorlar',
  ],
  [
    'So\'rov muvaffaqiyatli bajarildi, %d qator o\'zgartirildi.',
    'So\'rov muvaffaqiyatli bajarildi, %d qatorlar o\'zgartirildi.',
  ],
  'Bajariladigan buyruqlar yo\'q.',
  [
    '%d so\'rov muvaffaqiyatli bajarildi.',
    '%d so\'rovlar muvaffaqiyatli bajarildi.',
  ],
  'Bajarish',
  'Qatorlarni cheklash',
  'Fayl yuklash',
  'Serverdan',
  'Veb-server fayli %s',
  'Faylni ishga tushirish',
  'Xatoda to\'xtash',
  'Faqat xatolarni ko\'rsatish',
  'Tarix',
  'Tozalash',
  'Hammasini tahrirlash',
  'Element o\'chirildi.',
  'Element yangilandi.',
  'Element%s kiritildi.',
  'Jadval o\'chirildi.',
  'Jadval o\'zgartirildi.',
  'Jadval yaratildi.',
  'Jadval nomi',
  'dvigatel',
  'Standart qiymatlar',
  '%s ni o\'chirasizmi?',
  'Bo\'lish mezon',
  'Bo\'limlar',
  'Bo\'lim nomi',
  'Qiymatlar',
  'Indekslar o\'zgartirildi.',
  'Indeks turi',
  'Algorithm',
  'Columns',
  'uzunlik',
  'Nomi',
  'Condition',
  'Ma\'lumotlar bazasi o\'chirildi.',
  'Ma\'lumotlar bazasi qayta nomlandi.',
  'Ma\'lumotlar bazasi yaratildi.',
  'Ma\'lumotlar bazasi o\'zgartirildi.',
  'Chaqirish',
  [
    'Protsedura chaqirildi, %d qator o\'zgartirildi.',
    'Protsedura chaqirildi, %d qatorlar o\'zgartirildi.',
  ],
  'Tashqi kalit o\'chirildi.',
  'Tashqi kalit o\'zgartirildi.',
  'Tashqi kalit yaratildi.',
  'Manba va maqsad ustunlari bir xil ma\'lumot turiga ega bo\'lishi kerak, maqsad ustunlarda indeks bo\'lishi kerak va havolalar qilingan ma\'lumotlar mavjud bo\'lishi kerak.',
  'Tashqi kalit',
  'Maqsad jadvali',
  'O\'zgartirish',
  'Ustun qo\'shish',
  'Ko\'rinish o\'zgartirildi.',
  'Ko\'rinish o\'chirildi.',
  'Ko\'rinish yaratildi.',
  'Ko\'rinish yaratish',
  'Hodisa o\'chirildi.',
  'Hodisa o\'zgartirildi.',
  'Hodisa yaratildi.',
  'Hodisani o\'zgartirish',
  'Hodisa yaratish',
  'Boshlash',
  'Tugatish',
  'Har bir',
  'Yakunlangandan so\'ng saqlash',
  'Protsedura o\'chirildi.',
  'Protsedura o\'zgartirildi.',
  'Protsedura yaratildi.',
  'Funksiyani o\'zgartirish',
  'Protseduranni o\'zgartirish',
  'Funksiya yaratish',
  'Protsedura yaratish',
  'Qaytarish turi',
  'Tekshirish o\'chirildi.',
  'Tekshirish o\'zgartirildi.',
  'Tekshirish yaratildi.',
  'Tekshirishni o\'zgartirish',
  'Trigger o\'chirildi.',
  'Trigger o\'zgartirildi.',
  'Trigger yaratildi.',
  'Triggerni o\'zgartirish',
  'Trigger yaratish',
  'Vaqt',
  'Hodisa',
  'Foydalanuvchi o\'chirildi.',
  'Foydalanuvchi o\'zgartirildi.',
  'Foydalanuvchi yaratildi.',
  'Xeshlangan',
  'Protsedura',
  'Berish',
  'Bekor qilish',
  [
    '%d jarayon to\'xtatildi.',
    '%d jarayonlar to\'xtatildi.',
  ],
  'Klonlash',
  'Jami %d',
  'To\'xtatish',
  [
    '%d element o\'zgartirildi.',
    '%d elementlar o\'zgartirildi.',
  ],
  'Qiymatni o\'zgartirish uchun Ctrl+bosing.',
  'Fayl UTF-8 kodlashda bo\'lishi kerak.',
  [
    '%d qator import qilindi.',
    '%d qatorlar import qilindi.',
  ],
  'Jadvalni tanlab bo\'lmadi',
  'O\'zgartirish',
  'Munosabatlar',
  'tahrirlash',
  'Bu qiymatni o\'zgartirish uchun tahrir havolasidan foydalaning.',
  'Ko\'proq ma\'lumot yuklash',
  'Yuklanmoqda',
  'Sahifa',
  'oxirgi',
  'Butun natija',
  'Jadvallar bo\'shatildi.',
  'Jadvallar ko\'chirildi.',
  'Jadvallar nusxalandi.',
  'Jadvallar o\'chirildi.',
  'Jadvallar optimallashtirildi.',
  'Sxema',
  'Jadvallar va ko\'rinishlar',
  'Jadvallarda ma\'lumotlarni qidirish',
  'Dvigatel',
  'Ma\'lumotlar hajmi',
  'Indeks hajmi',
  'Bo\'sh ma\'lumotlar',
  'Qatorlar',
  'Tozalash',
  'Optimallash',
  'Tekshirish',
  'Tahlil qilish',
  'Ta\'mirlash',
  'Bo\'shatish',
  'Boshqa ma\'lumotlar bazasiga ko\'chirish',
  'Ko\'chirish',
  'Nusxalash',
  'qayta yozish',
  'Jadval',
  'Belgilangan vaqtda',
  'Turni o\'zgartirish',
];
		case "vi": return [
  '%.3f s',
  'Không thể tải tệp lên.',
  'Kích thước tệp tối đa là %sB.',
  'Tệp không tồn tại.',
  ',',
  '0123456789',
  'Kiểu tự định nghĩa',
  'Bạn có chắc',
  'Increase %s.',
  'Chức năng tải tệp lên đã bị cấm.',
  'bản gốc',
  'Không có bảng nào.',
  'Sửa',
  'Thêm',
  'Không có dòng dữ liệu nào.',
  'Bạn không có quyền sửa bảng này.',
  'Lưu',
  'Lưu và tiếp tục sửa',
  'Lưu và thêm tiếp',
  'Saving',
  'Xoá',
  'Ngôn ngữ',
  'Sử dụng',
  'Unknown error.',
  'Hệ thống',
  'Máy chủ',
  'hostname[:port] or :socket',
  'Tên người dùng',
  'Mật khẩu',
  'Cơ sở dữ liệu',
  'Đăng nhập',
  'Giữ đăng nhập một thời gian',
  'Adminer does not support accessing a database without a password, <a href="https://www.adminer.org/en/password/"%s>more information</a>.',
  'Xem dữ liệu',
  'Hiện cấu trúc',
  'Sửa khung nhìn',
  'Sửa bảng',
  'Thêm',
  'Warnings',
  '%d byte(s)',
  'Cột',
  'Loại',
  'Chú thích',
  'Tăng tự động',
  'Default value',
  'Xem',
  'Các chức năng',
  'Tổng hợp',
  'Tìm kiếm',
  'bất cứ đâu',
  'Sắp xếp',
  'giảm dần',
  'Giới hạn',
  'Chiều dài văn bản',
  'Hành động',
  'Quét toàn bộ bảng',
  'Câu lệnh SQL',
  'xem',
  'lưu',
  'Thay đổi CSDL',
  'Thay đổi schema',
  'Tạo schema',
  'Cấu trúc CSDL',
  'Quyền truy cập',
  'Routines',
  'Dãy số',
  'Sự kiện',
  'Nhập khẩu',
  'Xuất',
  'Tạo bảng',
  'DB',
  'xem',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  'Disable %s or enable %s or %s extensions.',
  'Số',
  'Ngày giờ',
  'Chuỗi',
  'Danh sách',
  'Mã máy',
  'Toạ độ',
  'ltr',
  'You are offline.',
  'Thoát',
  'Bạn gõ sai tài khoản quá nhiều lần, hãy thử lại sau %d phút nữa.',
  'Đã thoát xong.',
  'Thanks for using Adminer, consider <a href="https://www.adminer.org/en/donation/">donating</a>.',
  'Phiên làm việc đã hết, hãy đăng nhập lại.',
  'Mật khẩu đã hết hạn. <a href="https://www.adminer.org/en/extension/"%s>Thử cách làm</a> để giữ cố định.',
  'Cần phải bật session.',
  'The action will be performed after successful login with the same credentials.',
  'Không có phần mở rộng',
  'Bản cài đặt PHP thiếu hỗ trợ cho %s.',
  'Connecting to privileged ports is not allowed.',
  'Tài khoản sai.',
  'There is a space in the input password which might be the cause.',
  'Mã kiểm tra CSRF sai, hãy nhập lại biểu mẫu.',
  'Thiết lập %s cần tăng thêm. (Đã vượt giới hạnố trường tối đa cho phép trong một biểu mẫu).',
  'If you did not send this request from Adminer then close this page.',
  'Dữ liệu tải lên/POST quá lớn. Hãy giảm kích thước tệp hoặc tăng cấu hình (hiện tại %s).',
  'Bạn có thể tải tệp lên dùng FTP và nhập vào cơ sở dữ liệu.',
  'Các khoá ngoại',
  'bảng mã',
  'Khi cập nhật',
  'Khi xoá',
  'Tên cột',
  'Tham số',
  'Độ dài',
  'Tuỳ chọn',
  'Thêm tiếp',
  'Chuyển lên trên',
  'Chuyển xuống dưới',
  'Xoá',
  'CSDL sai.',
  'Các CSDL đã bị xoá.',
  'Chọn CSDL',
  'Tạo CSDL',
  'Danh sách tiến trình',
  'Biến',
  'Trạng thái',
  'Phiên bản %s: %s (PHP extension: %s)',
  'Vào dưới tên: %s',
  'Làm mới',
  'Bộ mã',
  'Các bảng',
  'Kích thước',
  'Tính',
  'Chọn',
  'Xoá',
  'Loaded plugins',
  'screenshot',
  'Materialized view',
  'Khung nhìn',
  'Bảng',
  'Inherits from',
  'Chỉ mục',
  'Sửa chỉ mục',
  'Nguồn',
  'Đích',
  'Sửa',
  'Thêm khoá ngoại',
  'Checks',
  'Create check',
  'Phản xạ',
  'Thêm phản xạ',
  'Inherited by',
  'Liên kết cố định',
  'Kết quả',
  'Định dạng',
  'Dữ liệu',
  'Tạo người dùng',
  'ATTACH queries are not supported.',
  'Có lỗi trong câu lệnh',
  '%d / ',
  '%s dòng',
  'Đã thực hiện xong, ảnh hưởng đến %d dòng.',
  'Chẳng có gì để thực hiện!.',
  '%d câu lệnh đã chạy thành công.',
  'Thực hiện',
  'Limit rows',
  'Tải tệp lên',
  'Dùng tệp trên máy chủ',
  'Tệp trên máy chủ %s',
  'Chạy tệp',
  'Dừng khi có lỗi',
  'Chỉ hiện lỗi',
  'Lịch sử',
  'Xoá',
  'Sửa tất cả',
  'Đã xoá.',
  'Đã cập nhật.',
  'Đã thêm%s.',
  'Bảng đã bị xoá.',
  'Bảng đã thay đổi.',
  'Bảng đã được tạo.',
  'Tên bảng',
  'cơ chế lưu trữ',
  'Giá trị mặc định',
  'Drop %s?',
  'Phân chia bằng',
  'Phân hoạch',
  'Tên phân hoạch',
  'Giá trị',
  'Chỉ mục đã được sửa.',
  'Loại chỉ mục',
  'Algorithm',
  'Columns',
  'độ dài',
  'Tên',
  'Condition',
  'CSDL đã bị xoá.',
  'Đã đổi tên CSDL.',
  'Đã tạo CSDL.',
  'Đã thay đổi CSDL.',
  'Gọi',
  'Đã chạy routine, thay đổi %d dòng.',
  'Khoá ngoại đã bị xoá.',
  'Khoá ngoại đã được sửa.',
  'Khoá ngoại đã được tạo.',
  'Cột gốc và cột đích phải cùng kiểu, phải đặt chỉ mục trong cột đích và dữ liệu tham chiếu phải tồn tại.',
  'Khoá ngoại',
  'Bảng đích',
  'Thay đổi',
  'Thêm cột',
  'Khung nhìn đã được sửa.',
  'Khung nhìn đã bị xoá.',
  'Khung nhìn đã được tạo.',
  'Tạo khung nhìn',
  'Đã xoá sự kiện.',
  'Đã thay đổi sự kiện.',
  'Đã tạo sự kiện.',
  'Sửa sự kiện',
  'Tạo sự kiện',
  'Bắt đầu',
  'Kết thúc',
  'Mỗi',
  'Khi kết thúc, duy trì',
  'Đã xoá routine.',
  'Đã thay đổi routine.',
  'Đã tạo routine.',
  'Thay đổi hàm',
  'Thay đổi thủ tục',
  'Tạo hàm',
  'Tạo lệnh',
  'Giá trị trả về',
  'Check has been dropped.',
  'Check has been altered.',
  'Check has been created.',
  'Alter check',
  'Đã xoá phản xạ.',
  'Đã sửa phản xạ.',
  'Đã tạo phản xạ.',
  'Sửa phản xạ',
  'Tạo phản xạ',
  'Thời gian',
  'Sự kiện',
  'Đã xoá người dùng.',
  'Đã sửa người dùng.',
  'Đã tạo người dùng.',
  'Mã hoá',
  'Hàm tích hợp',
  'Cấp quyền',
  'Tước quyền',
  '%d tiến trình đã dừng.',
  'Sao chép',
  '%s',
  'Dừng',
  '%d phần đã thay đổi.',
  'Nhấn Ctrl và bấm vào giá trị để sửa.',
  'Tệp phải mã hoá bằng chuẩn UTF-8.',
  'Đã nhập % dòng dữ liệu.',
  'Không thể xem dữ liệu',
  'Sửa',
  'Quan hệ',
  'sửa',
  'Dùng nút sửa để thay đổi giá trị này.',
  'Xem thêm dữ liệu',
  'Đang nạp',
  'trang',
  'cuối',
  'Toàn bộ kết quả',
  'Bảng đã bị làm rỗng.',
  'Bảng.',
  'Bảng đã được sao chép.',
  'Các bảng đã bị xoá.',
  'Bảng đã được tối ưu.',
  'Schema',
  'Bảng và khung nhìn',
  'Tìm kiếm dữ liệu trong các bảng',
  'Cơ chế lưu trữ',
  'Kích thước dữ liệu',
  'Kích thước chỉ mục',
  'Dữ liệu trống',
  'Số dòng',
  'Dọn dẹp',
  'Tối ưu',
  'Kiểm tra',
  'Phân tích',
  'Sửa chữa',
  'Làm rỗng',
  'Chuyển tới cơ sở dữ liệu khác',
  'Chuyển đi',
  'Sao chép',
  'overwrite',
  'Đặt lịch',
  'Vào thời gian xác định',
  'Sửa kiểu dữ liệu',
];
		case "zh": return [
  '%.3f 秒',
  '不能上传文件。',
  '最多允许的文件大小为 %sB。',
  '文件不存在。',
  ',',
  '0123456789',
  '用户类型',
  '您确定吗？',
  'Increase %s.',
  '文件上传被禁用。',
  '原始',
  '没有表。',
  '编辑',
  '插入',
  '无数据。',
  '您没有权限更新这个表。',
  '保存',
  '保存并继续编辑',
  '保存并插入下一个',
  '保存中',
  '删除',
  '语言',
  '使用',
  '未知错误。',
  '系统',
  '服务器',
  'hostname[:port] or :socket',
  '用户名',
  '密码',
  '数据库',
  '登录',
  '保持登录',
  'Adminer默认不支持访问没有密码的数据库，<a href="https://www.adminer.org/en/password/"%s>详情见这里</a>。',
  '选择数据',
  '显示结构',
  '修改视图',
  '修改表',
  '新建数据',
  '警告',
  '%d 字节',
  '列',
  '类型',
  '注释',
  '自动增量',
  '默认值',
  '选择',
  '函数',
  '集合',
  '搜索',
  '任意位置',
  '排序',
  '降序',
  '范围',
  '文本显示限制',
  '动作',
  '全表扫描',
  'SQL命令',
  '打开',
  '保存',
  '修改数据库',
  '修改模式',
  '创建模式',
  '数据库概要',
  '权限',
  '子程序',
  '序列',
  '事件',
  '导入',
  '导出',
  '创建表',
  '数据库',
  '选择',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  '禁用 %s 或启用 %s 或 %s 扩展。',
  '数字',
  '日期时间',
  '字符串',
  '列表',
  '二进制',
  '几何图形',
  'ltr',
  '您离线了。',
  '登出',
  '登录失败次数过多，请 %d 分钟后重试。',
  '成功登出。',
  '感谢使用Adminer，请考虑为我们<a href="https://www.adminer.org/en/donation/">捐款（英文页面）</a>。',
  '会话已过期，请重新登录。',
  '主密码已过期。<a href="https://www.adminer.org/en/extension/"%s>请扩展</a> %s 方法让它永久化。',
  '必须启用会话支持。',
  '此操作将在成功使用相同的凭据登录后执行。',
  '没有扩展',
  '没有支持的 PHP 扩展可用（%s）。',
  '不允许连接到特权端口。',
  '无效凭据。',
  '您输入的密码中有一个空格，这可能是导致问题的原因。',
  '无效 CSRF 令牌。请重新发送表单。',
  '超过最多允许的字段数量。请增加 %s。',
  '如果您并没有从Adminer发送请求，请关闭此页面。',
  'POST 数据太大。请减少数据或者增加 %s 配置命令。',
  '您可以通过FTP上传大型SQL文件并从服务器导入。',
  '外键',
  '校对',
  'ON UPDATE',
  'ON DELETE',
  '字段名',
  '参数名',
  '长度',
  '选项',
  '下一行插入',
  '上移',
  '下移',
  '移除',
  '无效数据库。',
  '已删除数据库。',
  '选择数据库',
  '创建数据库',
  '进程列表',
  '变量',
  '状态',
  '%s 版本：%s， 使用PHP扩展 %s',
  '登录用户：%s',
  '刷新',
  '校对',
  '表',
  '大小',
  '计算',
  '已选中',
  '删除',
  'Loaded plugins',
  'screenshot',
  '物化视图',
  '视图',
  '表',
  'Inherits from',
  '索引',
  '修改索引',
  '源',
  '目标',
  '修改',
  '添加外键',
  'Checks',
  'Create check',
  '触发器',
  '创建触发器',
  'Inherited by',
  '固定链接',
  '输出',
  '格式',
  '数据',
  '创建用户',
  '不支持ATTACH查询。',
  '查询出错',
  '%d / ',
  '%d 行',
  '查询执行完毕，%d 行受影响。',
  '没有命令被执行。',
  '%d 条查询已成功执行。',
  '执行',
  '限制行数',
  '文件上传',
  '来自服务器',
  'Web服务器文件 %s',
  '运行文件',
  '出错时停止',
  '仅显示错误',
  '历史',
  '清除',
  '编辑全部',
  '已删除项目。',
  '已更新项目。',
  '已插入项目%s。',
  '已删除表。',
  '已修改表。',
  '已创建表。',
  '表名',
  '引擎',
  '默认值',
  '删除 %s?',
  '分区类型',
  '分区',
  '分区名',
  '值',
  '已修改索引。',
  '索引类型',
  'Algorithm',
  'Columns',
  'length',
  '名称',
  'Condition',
  '已删除数据库。',
  '已重命名数据库。',
  '已创建数据库。',
  '已修改数据库。',
  '调用',
  '子程序被调用，%d 行被影响。',
  '已删除外键。',
  '已修改外键。',
  '已创建外键。',
  '源列和目标列必须具有相同的数据类型，在目标列上必须有一个索引并且引用的数据必须存在。',
  '外键',
  '目标表',
  '修改',
  '增加列',
  '已修改视图。',
  '已删除视图。',
  '已创建视图。',
  '创建视图',
  '已删除事件。',
  '已修改事件。',
  '已创建事件。',
  '修改事件',
  '创建事件',
  '开始',
  '结束',
  '每',
  '完成后仍保留',
  '已删除子程序。',
  '已修改子程序。',
  '已创建子程序。',
  '修改函数',
  '修改过程',
  '创建函数',
  '创建过程',
  '返回类型',
  'Check has been dropped.',
  'Check has been altered.',
  'Check has been created.',
  'Alter check',
  '已删除触发器。',
  '已修改触发器。',
  '已创建触发器。',
  '修改触发器',
  '创建触发器',
  '时间',
  '事件',
  '已删除用户。',
  '已修改用户。',
  '已创建用户。',
  'Hashed',
  '子程序',
  '授权',
  '废除',
  '%d 个进程被终止。',
  '复制',
  '共计 %d',
  '终止',
  '%d 个项目受到影响。',
  '按住Ctrl并单击某个值进行修改。',
  '文件必须使用UTF-8编码。',
  '%d 行已导入。',
  '不能选择该表',
  '修改',
  '关联信息',
  '编辑',
  '使用编辑链接修改该值。',
  '加载更多数据',
  '加载中',
  '页面',
  '最后',
  '所有结果',
  '已清空表。',
  '已转移表。',
  '已复制表。',
  '已删除表。',
  '已优化表。',
  '模式',
  '表和视图',
  '在表中搜索数据',
  '引擎',
  '数据长度',
  '索引长度',
  '数据空闲',
  '行数',
  '整理（Vacuum）',
  '优化',
  '检查',
  '分析',
  '修复',
  '清空',
  '转移到其它数据库',
  '转移',
  '复制',
  '覆盖',
  '调度',
  '在指定时间',
  '修改类型',
];
		case "zh-tw": return [
  '%.3f 秒',
  '無法上傳檔案。',
  '允許的檔案上限大小為 %sB。',
  '檔案不存在。',
  ',',
  '0123456789',
  '使用者類型',
  '你確定嗎？',
  'Increase %s.',
  '檔案上傳已經被停用。',
  '原始',
  '沒有資料表。',
  '編輯',
  '新增',
  '沒有資料行。',
  '您沒有許可權更新這個資料表。',
  '儲存',
  '儲存並繼續編輯',
  '儲存並新增下一筆',
  '保存中',
  '刪除',
  '語言',
  '使用',
  '未知錯誤。',
  '資料庫系統',
  '伺服器',
  'hostname[:port] or :socket',
  '帳號',
  '密碼',
  '資料庫',
  '登入',
  '永久登入',
  'Adminer預設不支援訪問沒有密碼的資料庫，<a href="https://www.adminer.org/en/password/"%s>詳情見這裡</a>。',
  '選擇資料',
  '顯示結構',
  '修改檢視表',
  '修改資料表',
  '新增項目',
  '警告',
  '%d byte(s)',
  '欄位',
  '類型',
  '註解',
  '自動遞增',
  '預設值',
  '選擇',
  '函式',
  '集合',
  '搜尋',
  '任意位置',
  '排序',
  '降冪 (遞減)',
  '限定',
  'Text 長度',
  '動作',
  '全資料表掃描',
  'SQL 命令',
  '打開',
  '儲存',
  '修改資料庫',
  '修改資料表結構',
  '建立資料表結構',
  '資料庫結構',
  '權限',
  '程序',
  '序列',
  '事件',
  '匯入',
  '匯出',
  '建立資料表',
  '資料庫',
  '選擇',
  '%s must <a%s>return an array</a>.',
  '<a%s>Configure</a> %s in %s.',
  '禁用 %s 或啟用 %s 或 %s 擴充模組。',
  '數字',
  '日期時間',
  '字串',
  '列表',
  '二進位',
  '幾何',
  'ltr',
  '您離線了。',
  '登出',
  '登錄失敗次數過多，請 %d 分鐘後重試。',
  '成功登出。',
  '感謝使用Adminer，請考慮為我們<a href="https://www.adminer.org/en/donation/">捐款（英文網頁）</a>。',
  'Session 已過期，請重新登入。',
  '主密碼已過期。<a href="https://www.adminer.org/en/extension/"%s>請擴展</a> %s 方法讓它永久化。',
  'Session 必須被啟用。',
  '此操作將在成功使用相同的憑據登錄後執行。',
  '無擴充模組',
  '沒有任何支援的 PHP 擴充模組（%s）。',
  '不允許連接到特權埠。',
  '無效的憑證。',
  '您輸入的密碼中有一個空格，這可能是導致問題的原因。',
  '無效的 CSRF token。請重新發送表單。',
  '超過允許的字段數量的最大值。請增加 %s。',
  '如果您並沒有從Adminer發送請求，請關閉此頁面。',
  'POST 資料太大。減少資料或者增加 %s 的設定值。',
  '您可以通過FTP上傳大型SQL檔並從伺服器導入。',
  '外來鍵',
  '校對',
  'ON UPDATE',
  'ON DELETE',
  '欄位名稱',
  '參數名稱',
  '長度',
  '選項',
  '新增下一筆',
  '上移',
  '下移',
  '移除',
  '無效的資料庫。',
  '資料庫已刪除。',
  '選擇資料庫',
  '建立資料庫',
  '處理程序列表',
  '變數',
  '狀態',
  '%s 版本：%s 透過 PHP 擴充模組 %s',
  '登錄為： %s',
  '重新載入',
  '校對',
  '資料表',
  '大小',
  '計算',
  '已選中',
  '刪除',
  'Loaded plugins',
  'screenshot',
  '物化視圖',
  '檢視表',
  '資料表',
  'Inherits from',
  '索引',
  '修改索引',
  '來源',
  '目標',
  '修改',
  '新增外來鍵',
  'Checks',
  'Create check',
  '觸發器',
  '建立觸發器',
  'Inherited by',
  '永久連結',
  '輸出',
  '格式',
  '資料',
  '建立使用者',
  '不支援ATTACH查詢。',
  '查詢發生錯誤',
  '%d / ',
  '%d 行',
  '執行查詢 OK，%d 行受影響。',
  '沒有命令可執行。',
  '已順利執行 %d 個查詢。',
  '執行',
  '限制行數',
  '檔案上傳',
  '從伺服器',
  '網頁伺服器檔案 %s',
  '執行檔案',
  '出錯時停止',
  '僅顯示錯誤訊息',
  '紀錄',
  '清除',
  '編輯全部',
  '該項目已被刪除。',
  '已更新項目。',
  '已新增項目 %s。',
  '已經刪除資料表。',
  '資料表已修改。',
  '資料表已建立。',
  '資料表名稱',
  '引擎',
  '預設值',
  '刪除 %s?',
  '分區類型',
  '分區',
  '分區名稱',
  '值',
  '已修改索引。',
  '索引類型',
  'Algorithm',
  'Columns',
  '長度',
  '名稱',
  'Condition',
  '資料庫已刪除。',
  '已重新命名資料庫。',
  '已建立資料庫。',
  '已修改資料庫。',
  '呼叫',
  '程序已被執行，%d 行被影響。',
  '已刪除外來鍵。',
  '已修改外來鍵。',
  '已建立外來鍵。',
  '來源列和目標列必須具有相同的資料類型，在目標列上必須有一個索引並且引用的資料必須存在。',
  '外來鍵',
  '目標資料表',
  '變更',
  '新增欄位',
  '已修改檢視表。',
  '已刪除檢視表。',
  '已建立檢視表。',
  '建立檢視表',
  '已刪除事件。',
  '已修改事件。',
  '已建立事件。',
  '修改事件',
  '建立事件',
  '開始',
  '結束',
  '每',
  '在完成後儲存',
  '已刪除程序。',
  '已修改子程序。',
  '已建立子程序。',
  '修改函式',
  '修改預存程序',
  '建立函式',
  '建立預存程序',
  '回傳類型',
  'Check has been dropped.',
  'Check has been altered.',
  'Check has been created.',
  'Alter check',
  '已刪除觸發器。',
  '已修改觸發器。',
  '已建立觸發器。',
  '修改觸發器',
  '建立觸發器',
  '時間',
  '事件',
  '已刪除使用者。',
  '已修改使用者。',
  '已建立使用者。',
  'Hashed',
  '程序',
  '授權',
  '廢除',
  '%d 個 Process(es) 被終止。',
  '複製',
  '總共 %d 個',
  '終止',
  '%d 個項目受到影響。',
  '按住Ctrl並按一下某個值進行修改。',
  '檔必須使用UTF-8編碼。',
  '已匯入 %d 行。',
  '無法選擇該資料表',
  '修改',
  '關聯',
  '編輯',
  '使用編輯連結來修改。',
  '載入更多資料',
  '載入中',
  '頁',
  '最後一頁',
  '所有結果',
  '已清空資料表。',
  '已轉移資料表。',
  '資料表已經複製。',
  '已經將資料表刪除。',
  '已優化資料表。',
  '資料表結構',
  '資料表和檢視表',
  '在資料庫搜尋',
  '引擎',
  '資料長度',
  '索引長度',
  '資料空閒',
  '行數',
  '整理（Vacuum）',
  '最佳化',
  '檢查',
  '分析',
  '修復',
  '清空',
  '轉移到其它資料庫',
  '轉移',
  '複製',
  '覆蓋',
  '排程',
  '在指定時間',
  '修改類型',
];
	}
	return array();
}

// this could be interface when "Db extends \mysqli" can have compatible type declarations (PHP 7)
// interfaces can include properties only since PHP 8.4
abstract class SqlDb {
	/** @var Db */ static $instance;

	/** @var string */ public $extension; // extension name
	/** @var string */ public $flavor = ''; // different vendor with the same API, e.g. MariaDB; usually stays empty
	/** @var string */ public $server_info; // server version
	/** @var int */ public $affected_rows = 0; // number of affected rows
	/** @var string */ public $info = ''; // see https://php.net/mysql_info
	/** @var int */ public $errno = 0; // last error code
	/** @var string */ public $error = ''; // last error message
	/** @var Result|bool */ protected $multi; // used for multiquery

	/** Connect to server
	* @return string error message
	*/
	abstract function attach($server, $username, $password);

	/** Quote string to use in SQL
	* @return string escaped string enclosed in '
	*/
	abstract function quote($string);

	/** Select database
	* @return bool boolish
	*/
	abstract function select_db($database);

	/** Send query
	* @return Result|bool
	*/
	abstract function query($query, $unbuffered = false);

	/** Send query with more resultsets
	* @return Result|bool
	*/
	function multi_query($query) {
		return $this->multi = $this->query($query);
	}

	/** Get current resultset
	* @return Result|bool
	*/
	function store_result() {
		return $this->multi;
	}

	/** Fetch next resultset */
	function next_result() {
		return false;
	}
}

// PDO can be used in several database drivers
if (extension_loaded('pdo')) {
	abstract class PdoDb extends SqlDb {
		protected $pdo;

		/** Connect to server using DSN
		* @param mixed[] $options
		* @return string error message
		*/
		function dsn($dsn, $username, $password, array $options = array()) {
			$options[\PDO::ATTR_ERRMODE] = \PDO::ERRMODE_SILENT;
			$options[\PDO::ATTR_STATEMENT_CLASS] = array('Adminer\PdoResult');
			try {
				$this->pdo = new \PDO($dsn, $username, $password, $options);
			} catch (\Exception $ex) {
				return $ex->getMessage();
			}
			$this->server_info = @$this->pdo->getAttribute(\PDO::ATTR_SERVER_VERSION);
			return '';
		}

		function quote($string) {
			return $this->pdo->quote($string);
		}

		function query($query, $unbuffered = false) {
			/** @var Result|bool */
			$result = $this->pdo->query($query);
			$this->error = "";
			if (!$result) {
				list(, $this->errno, $this->error) = $this->pdo->errorInfo();
				if (!$this->error) {
					$this->error = lang(23);
				}
				return false;
			}
			$this->store_result($result);
			return $result;
		}

		function store_result($result = null) {
			if (!$result) {
				$result = $this->multi;
				if (!$result) {
					return false;
				}
			}
			if ($result->columnCount()) {
				$result->num_rows = $result->rowCount(); // is not guaranteed to work with all drivers
				return $result;
			}
			$this->affected_rows = $result->rowCount();
			return true;
		}

		function next_result() {
			/** @var PdoResult|bool */
			$result = $this->multi;
			if (!is_object($result)) {
				return false;
			}
			$result->_offset = 0;
			return @$result->nextRowset(); // @ - PDO_PgSQL doesn't support it
		}
	}

	class PdoResult extends \PDOStatement {
		public $_offset = 0, $num_rows;

		function fetch_assoc() {
			return $this->fetch_array(\PDO::FETCH_ASSOC);
		}

		function fetch_row() {
			return $this->fetch_array(\PDO::FETCH_NUM);
		}

		private function fetch_array($mode) {
			$return = $this->fetch($mode);
			return ($return ? array_map(array($this, 'unresource'), $return) : $return);
		}

		private function unresource($val) {
			return (is_resource($val) ? stream_get_contents($val) : $val);
		}

		function fetch_field() {
			$row = (object) $this->getColumnMeta($this->_offset++);
			$type = $row->pdo_type;
			$row->type = ($type == \PDO::PARAM_INT ? 0 : 15);
			$row->charsetnr = ($type == \PDO::PARAM_LOB || (isset($row->flags) && in_array("blob", (array) $row->flags)) ? 63 : 0);
			return $row;
		}

		function seek($offset) {
			for ($i=0; $i < $offset; $i++) {
				$this->fetch();
			}
		}
	}
}

/** Add or overwrite a driver */
function add_driver($id, $name) {
	SqlDriver::$drivers[$id] = $name;
}

/** Get driver name */
function get_driver($id) {
	return SqlDriver::$drivers[$id];
}

abstract class SqlDriver {
	/** @var Driver */ static $instance;
	/** @var string[] */ static $drivers = array(); // all available drivers
	/** @var list<string> */ static $extensions = array(); // possible extensions in the current driver
	/** @var string */ static $jush; // JUSH identifier

	/** @var Db */ protected $conn;
	/** @var int[][] */ protected $types = array(); // [$group => [$type => $maximum_unsigned_length, ...], ...]
	/** @var string */ public $delimiter = ";";
	/** @var string[] */ public $insertFunctions = array(); // ["$type|$type2" => "$function/$function2"] functions used in edit and insert
	/** @var string[] */ public $editFunctions = array(); // ["$type|$type2" => "$function/$function2"] functions used in edit only
	/** @var list<string> */ public $unsigned = array(); // number variants
	/** @var list<string> */ public $operators = array(); // operators used in select
	/** @var list<string> */ public $functions = array(); // functions used in select
	/** @var list<string> */ public $grouping = array(); // grouping functions used in select
	/** @var string */ public $onActions = "RESTRICT|NO ACTION|CASCADE|SET NULL|SET DEFAULT"; // used in foreign_keys()
	/** @var list<string> */ public $partitionBy = array(); // supported partitioning types
	/** @var string */ public $inout = "IN|OUT|INOUT"; // used in routines
	/** @var string */ public $enumLength = "'(?:''|[^'\\\\]|\\\\.)*'"; // regular expression for parsing enum lengths
	/** @var list<string> */ public $generated = array(); // allowed types of generated columns

	/** Connect to the database
	* @return Db|string string for error
	*/
	static function connect($server, $username, $password) {
		$connection = new Db;
		return ($connection->attach($server, $username, $password) ?: $connection);
	}

	/** Create object for performing database operations */
	function __construct(Db $connection) {
		$this->conn = $connection;
	}

	/** Get all types
	* @return int[] [$type => $maximum_unsigned_length, ...]
	*/
	function types() {
		return call_user_func_array('array_merge', array_values($this->types));
	}

	/** Get structured types
	* @return list<string>[]|list<string> [$description => [$type, ...], ...]
	*/
	function structuredTypes() {
		return array_map('array_keys', $this->types);
	}

	/** Get enum values
	* @param Field $field
	* @return string|void
	*/
	function enumLength(array $field) {
	}

	/** Function used to convert the value inputted by user
	* @param Field $field
	* @return string|void
	*/
	function unconvertFunction(array $field) {
	}

	/** Select data from table
	* @param list<string> $select result of adminer()->selectColumnsProcess()[0]
	* @param list<string> $where result of adminer()->selectSearchProcess()
	* @param list<string> $group result of adminer()->selectColumnsProcess()[1]
	* @param list<string> $order result of adminer()->selectOrderProcess()
	* @param int $limit result of adminer()->selectLimitProcess()
	* @param int $page index of page starting at zero
	* @param bool $print whether to print the query
	* @return Result|false
	*/
	function select($table, array $select, array $where, array $group, array $order = array(), $limit = 1, $page = 0, $print = false) {
		$is_group = (count($group) < count($select));
		$query = adminer()->selectQueryBuild($select, $where, $group, $order, $limit, $page);
		if (!$query) {
			$query = "SELECT" . limit(
				($_GET["page"] != "last" && $limit && $group && $is_group && JUSH == "sql" ? "SQL_CALC_FOUND_ROWS " : "") . implode(", ", $select) . "\nFROM " . table($table),
				($where ? "\nWHERE " . implode(" AND ", $where) : "") . ($group && $is_group ? "\nGROUP BY " . implode(", ", $group) : "") . ($order ? "\nORDER BY " . implode(", ", $order) : ""),
				$limit,
				($page ? $limit * $page : 0),
				"\n"
			);
		}
		$start = microtime(true);
		$return = $this->conn->query($query);
		if ($print) {
			echo adminer()->selectQuery($query, $start, !$return);
		}
		return $return;
	}

	/** Delete data from table
	* @param string $queryWhere " WHERE ..."
	* @param int $limit 0 or 1
	* @return Result|bool
	*/
	function delete($table, $queryWhere, $limit = 0) {
		$query = "FROM " . table($table);
		return queries("DELETE" . ($limit ? limit1($table, $query, $queryWhere) : " $query$queryWhere"));
	}

	/** Update data in table
	* @param string[] $set escaped columns in keys, quoted data in values
	* @param string $queryWhere " WHERE ..."
	* @param int $limit 0 or 1
	* @return Result|bool
	*/
	function update($table, array $set, $queryWhere, $limit = 0, $separator = "\n") {
		$values = array();
		foreach ($set as $key => $val) {
			$values[] = "$key = $val";
		}
		$query = table($table) . " SET$separator" . implode(",$separator", $values);
		return queries("UPDATE" . ($limit ? limit1($table, $query, $queryWhere, $separator) : " $query$queryWhere"));
	}

	/** Insert data into table
	* @param string[] $set escaped columns in keys, quoted data in values
	* @return Result|bool
	*/
	function insert($table, array $set) {
		return queries("INSERT INTO " . table($table) . ($set
			? " (" . implode(", ", array_keys($set)) . ")\nVALUES (" . implode(", ", $set) . ")"
			: " DEFAULT VALUES"
		) . $this->insertReturning($table));
	}

	/** Get RETURNING clause for INSERT queries (PostgreSQL specific) */
	function insertReturning($table) {
		return "";
	}

	/** Insert or update data in table
	* @param list<string[]> $rows of arrays with escaped columns in keys and quoted data in values
	* @param int[] $primary column names in keys
	* @return Result|bool
	*/
	function insertUpdate($table, array $rows, array $primary) {
		return false;
	}

	/** Begin transaction
	* @return Result|bool
	*/
	function begin() {
		return queries("BEGIN");
	}

	/** Commit transaction
	* @return Result|bool
	*/
	function commit() {
		return queries("COMMIT");
	}

	/** Rollback transaction
	* @return Result|bool
	*/
	function rollback() {
		return queries("ROLLBACK");
	}

	/** Return query with a timeout
	* @param int $timeout seconds
	* @return string|void null if the driver doesn't support query timeouts
	*/
	function slowQuery($query, $timeout) {
	}

	/** Convert column to be searchable
	* @param string $idf escaped column name
	* @param array{op:string, val:string} $val
	* @param Field $field
	*/
	function convertSearch($idf, array $val, array $field) {
		return $idf;
	}

	/** Convert value returned by database to actual value
	* @param array{type: string} $field
	*/
	function value($val, array $field) {
		return (method_exists($this->conn, 'value') ? $this->conn->value($val, $field) : $val);
	}

	/** Quote binary string */
	function quoteBinary($s) {
		return q($s);
	}

	/** Get warnings about the last command
	* @return string|void HTML
	*/
	function warnings() {
	}

	/** Get help link for table
	* @return string|void relative URL
	*/
	function tableHelp($name, $is_view = false) {
	}

	/** Get tables this table inherits from
	* @return list<array{table: string, ns: string}>
	*/
	function inheritsFrom($table) {
		return array();
	}

	/** Get inherited tables
	* @return list<array{table: string, ns: string}>
	*/
	function inheritedTables($table) {
		return array();
	}

	/** Get partitions info
	* @return Partitions
	*/
	function partitionsInfo($table) {
		return array();
	}

	/** Check if C-style escapes are supported */
	function hasCStyleEscapes() {
		return false;
	}

	/** Get supported engines
	* @return list<string>
	*/
	function engines() {
		return array();
	}

	/** Check whether table supports indexes
	* @param TableStatus $table_status
	*/
	function supportsIndex(array $table_status) {
		return !is_view($table_status);
	}

	/** Return list of supported index algorithms, first one is default
	 * @param TableStatus $tableStatus
	 * @return list<string>
	 */
	function indexAlgorithms(array $tableStatus) {
		return array();
	}

	/** Get defined check constraints
	* @return string[] [$name => $clause]
	*/
	function checkConstraints($table) {
		// MariaDB contains CHECK_CONSTRAINTS.TABLE_NAME, MySQL and PostrgreSQL not
		return get_key_vals("SELECT c.CONSTRAINT_NAME, CHECK_CLAUSE
FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS c
JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS t ON c.CONSTRAINT_SCHEMA = t.CONSTRAINT_SCHEMA AND c.CONSTRAINT_NAME = t.CONSTRAINT_NAME" . ($this->conn->flavor == 'maria' ? " AND c.TABLE_NAME = t.TABLE_NAME" : "") . "
WHERE c.CONSTRAINT_SCHEMA = " . q($_GET["ns"] != "" ? $_GET["ns"] : DB) . "
AND t.TABLE_NAME = " . q($table) . (JUSH == "pgsql" ? "
AND CHECK_CLAUSE NOT LIKE '% IS NOT NULL'" : ""), $this->conn); // ignore default IS NOT NULL checks in PostrgreSQL
	}

	/** Get all fields in the current schema
	* @return array<list<array{field:string, null:bool, type:string, length:?numeric-string}>> optionally also 'primary'
	*/
	function allFields() {
		$return = array();
		if (DB != "") {
			foreach (
				get_rows("SELECT TABLE_NAME AS tab, COLUMN_NAME AS field, IS_NULLABLE AS nullable, DATA_TYPE AS type, CHARACTER_MAXIMUM_LENGTH AS length" . (JUSH == 'sql' ? ", COLUMN_KEY = 'PRI' AS `primary`" : "") . "
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = " . q($_GET["ns"] != "" ? $_GET["ns"] : DB) . "
ORDER BY TABLE_NAME, ORDINAL_POSITION", $this->conn) as $row
			) {
				$row["null"] = ($row["nullable"] == "YES");
				$return[$row["tab"]][] = $row;
			}
		}
		return $return;
	}
}

// any method change in this file should be transferred to editor/include/adminer.inc.php

/** Default Adminer plugin; it should call methods via adminer()->f() instead of $this->f() to give chance to other plugins */
class Adminer {
	/** @var Adminer|Plugins */ static $instance;
	/** @visibility protected(set) */ public $error = ''; // HTML

	/** Name in title and navigation
	* @return string HTML code
	*/
	function name() {
		return "<a href='https://www.adminer.org/'" . target_blank() . " id='h1'><img src='" . h(preg_replace("~\\?.*~", "", ME) . "?file=logo.png&version=5.4.2") . "' width='24' height='24' alt='' id='logo'>Adminer</a>";
	}

	/** Connection parameters
	* @return array{string, string, string}
	*/
	function credentials() {
		return array(SERVER, $_GET["username"], get_password());
	}

	/** Get SSL connection options
	* @return string[]|void
	*/
	function connectSsl() {
	}

	/** Get key used for permanent login
	* @return string cryptic string which gets combined with password or '' in case of an error
	*/
	function permanentLogin($create = false) {
		return password_file($create);
	}

	/** Return key used to group brute force attacks; behind a reverse proxy, you want to return the last part of X-Forwarded-For */
	function bruteForceKey() {
		return $_SERVER["REMOTE_ADDR"];
	}

	/** Get server name displayed in breadcrumbs
	* @return string HTML code or null
	*/
	function serverName($server) {
		return h($server);
	}

	/** Identifier of selected database */
	function database() {
		// should be used everywhere instead of DB
		return DB;
	}

	/** Get cached list of databases
	* @return list<string>
	*/
	function databases($flush = true) {
		return get_databases($flush);
	}

	/** Print links after list of plugins */
	function pluginsLinks() {
	}

	/** Operators used in select
	* @return list<string> operators
	*/
	function operators() {
		return driver()->operators;
	}

	/** Get list of schemas
	* @return list<string>
	*/
	function schemas() {
		return schemas();
	}

	/** Specify limit for waiting on some slow queries like DB list
	* @return float number of seconds
	*/
	function queryTimeout() {
		return 2;
	}

	/** Called after connecting and selecting a database */
	function afterConnect() {
	}

	/** Headers to send before HTML output */
	function headers() {
	}

	/** Get Content Security Policy headers
	* @param list<string[]> $csp of arrays with directive name in key, allowed sources in value
	* @return list<string[]> same as $csp
	*/
	function csp(array $csp) {
		return $csp;
	}

	/** Print HTML code inside <head>
	* @param bool $dark dark CSS: false to disable, true to force, null to base on user preferences
	* @return bool true to link favicon.ico
	*/
	function head($dark = null) {
		// this is matched by compile.php
		
		
		return true;
	}

	/** Print extra classes in <body class>; must start with a space */
	function bodyClass() {
		echo " adminer";
	}

	/** Get URLs of the CSS files
	* @return string[] key is URL, value is either 'light' (supports only light color scheme), 'dark' or '' (both)
	*/
	function css() {
		$return = array();
		foreach (array("", "-dark") as $mode) {
			$filename = "adminer$mode.css";
			if (file_exists($filename)) {
				$file = file_get_contents($filename);
				$return["$filename?v=" . crc32($file)] = ($mode
					? "dark"
					: (preg_match('~prefers-color-scheme:\s*dark~', $file) ? '' : 'light')
				);
			}
		}
		return $return;
	}

	/** Print login form */
	function loginForm() {
		echo "<table class='layout'>\n";
		// this is matched by compile.php
		echo adminer()->loginFormField('driver', '<tr><th>' . lang(24) . '<td>', input_hidden("auth[driver]", "server") . "MySQL / MariaDB");
		echo adminer()->loginFormField('server', '<tr><th>' . lang(25) . '<td>', '<input name="auth[server]" value="' . h(SERVER) . '" title="' . lang(26) . '" placeholder="localhost" autocapitalize="off">');
		// this is matched by compile.php
		echo adminer()->loginFormField('username', '<tr><th>' . lang(27) . '<td>', '<input name="auth[username]" id="username" autofocus value="' . h($_GET["username"]) . '" autocomplete="username" autocapitalize="off">');
		echo adminer()->loginFormField('password', '<tr><th>' . lang(28) . '<td>', '<input type="password" name="auth[password]" autocomplete="current-password">');
		echo adminer()->loginFormField('db', '<tr><th>' . lang(29) . '<td>', '<input name="auth[db]" value="' . h($_GET["db"]) . '" autocapitalize="off">');
		echo "</table>\n";
		echo "<p><input type='submit' value='" . lang(30) . "'>\n";
		echo checkbox("auth[permanent]", 1, $_COOKIE["adminer_permanent"], lang(31)) . "\n";
	}

	/** Get login form field
	* @param string $heading HTML
	* @param string $value HTML
	*/
	function loginFormField($name, $heading, $value) {
		return $heading . $value . "\n";
	}

	/** Authorize the user
	* @return mixed true for success, string for error message, false for unknown error
	*/
	function login($login, $password) {
		if ($password == "") {
			return lang(32, target_blank());
		}
		return true;
	}

	/** Table caption used in navigation and headings
	* @param TableStatus $tableStatus
	* @return string HTML code, "" to ignore table
	*/
	function tableName(array $tableStatus) {
		return h($tableStatus["Name"]);
	}

	/** Field caption used in select and edit
	* @param Field|RoutineField $field
	* @param int $order order of column in select
	* @return string HTML code, "" to ignore field
	*/
	function fieldName(array $field, $order = 0) {
		$type = $field["full_type"];
		$comment = $field["comment"];
		return '<span title="' . h($type . ($comment != "" ? ($type ? ": " : "") . $comment : '')) . '">' . h($field["field"]) . '</span>';
	}

	/** Print links after select heading
	* @param TableStatus $tableStatus
	* @param ?string $set new item options, NULL for no new item
	*/
	function selectLinks(array $tableStatus, $set = "") {
		$name = $tableStatus["Name"];
		echo '<p class="links">';
		$links = array("select" => lang(33));
		if (support("table") || support("indexes")) {
			$links["table"] = lang(34);
		}
		$is_view = false;
		if (support("table")) {
			$is_view = is_view($tableStatus);
			if ($is_view) {
				if (support("view")) {
					$links["view"] = lang(35);
				}
			} elseif (function_exists('Adminer\alter_table')) {
				$links["create"] = lang(36);
			}
		}
		if ($set !== null) {
			$links["edit"] = lang(37);
		}
		foreach ($links as $key => $val) {
			echo " <a href='" . h(ME) . "$key=" . urlencode($name) . ($key == "edit" ? $set : "") . "'" . bold(isset($_GET[$key])) . ">$val</a>";
		}
		echo doc_link(array(JUSH => driver()->tableHelp($name, $is_view)), "?");
		echo "\n";
	}

	/** Get foreign keys for table
	* @return ForeignKey[] same format as foreign_keys()
	*/
	function foreignKeys($table) {
		return foreign_keys($table);
	}

	/** Find backward keys for table
	* @return BackwardKey[]
	*/
	function backwardKeys($table, $tableName) {
		return array();
	}

	/** Print backward keys for row
	* @param BackwardKey[] $backwardKeys
	* @param string[] $row
	*/
	function backwardKeysPrint(array $backwardKeys, array $row) {
	}

	/** Query printed in select before execution
	* @param string $query query to be executed
	* @param float $start start time of the query
	*/
	function selectQuery($query, $start, $failed = false) {
		$return = "</p>\n"; // required for IE9 inline edit
		if (!$failed && ($warnings = driver()->warnings())) {
			$id = "warnings";
			$return = ", <a href='#$id'>" . lang(38) . "</a>" . script("qsl('a').onclick = partial(toggle, '$id');", "")
				. "$return<div id='$id' class='hidden'>\n$warnings</div>\n"
			;
		}
		return "<p><code class='jush-" . JUSH . "'>" . h(str_replace("\n", " ", $query)) . "</code> <span class='time'>(" . format_time($start) . ")</span>"
			. (support("sql") ? " <a href='" . h(ME) . "sql=" . urlencode($query) . "'>" . lang(12) . "</a>" : "")
			. $return
		;
	}

	/** Query printed in SQL command before execution
	* @param string $query query to be executed
	* @return string escaped query to be printed
	*/
	function sqlCommandQuery($query) {
		return shorten_utf8(trim($query), 1000);
	}

	/** Print HTML code just before the Execute button in SQL command */
	function sqlPrintAfter() {
	}

	/** Description of a row in a table
	* @return string SQL expression, empty string for no description
	*/
	function rowDescription($table) {
		return "";
	}

	/** Get descriptions of selected data
	* @param list<string[]> $rows all data to print
	* @param list<ForeignKey>[] $foreignKeys
	* @return list<string[]>
	*/
	function rowDescriptions(array $rows, array $foreignKeys) {
		return $rows;
	}

	/** Get a link to use in select table
	* @param string $val raw value of the field
	* @param array{type: string} $field
	* @return string|void null to create the default link
	*/
	function selectLink($val, array $field) {
	}

	/** Value printed in select table
	* @param ?string $val HTML-escaped value to print
	* @param ?string $link link to foreign key
	* @param array{type: string} $field
	* @param string $original original value before applying editVal() and escaping
	*/
	function selectVal($val, $link, array $field, $original) {
		$return = ($val === null ? "<i>NULL</i>"
			: (preg_match("~char|binary|boolean~", $field["type"]) && !preg_match("~var~", $field["type"]) ? "<code>$val</code>"
			: (preg_match('~json~', $field["type"]) ? "<code class='jush-js'>$val</code>"
			: $val)
		));
		if (is_blob($field) && !is_utf8($val)) {
			$return = "<i>" . lang(39, strlen($original)) . "</i>";
		}
		return ($link ? "<a href='" . h($link) . "'" . (is_url($link) ? target_blank() : "") . ">$return</a>" : $return);
	}

	/** Value conversion used in select and edit
	* @param array{type: string} $field
	*/
	function editVal($val, array $field) {
		return $val;
	}

	/** Get configuration options for AdminerConfig
	* @return string[] key is config description, value is HTML
	*/
	function config() {
		return array();
	}

	/** Print table structure in tabular format
	* @param Field[] $fields
	* @param TableStatus $tableStatus
	*/
	function tableStructurePrint(array $fields, $tableStatus = null) {
		echo "<div class='scrollable'>\n";
		echo "<table class='nowrap odds'>\n";
		echo "<thead><tr><th>" . lang(40) . "<td>" . lang(41) . (support("comment") ? "<td>" . lang(42) : "") . "</thead>\n";
		$structured_types = driver()->structuredTypes();
		foreach ($fields as $field) {
			echo "<tr><th>" . h($field["field"]);
			$type = h($field["full_type"]);
			$collation = h($field["collation"]);
			echo "<td><span title='$collation'>"
				. (in_array($type, (array) $structured_types[lang(6)])
					? "<a href='" . h(ME . 'type=' . urlencode($type)) . "'>$type</a>"
					: $type . ($collation && isset($tableStatus["Collation"]) && $collation != $tableStatus["Collation"] ? " $collation" : ""))
				. "</span>"
			;
			echo ($field["null"] ? " <i>NULL</i>" : "");
			echo ($field["auto_increment"] ? " <i>" . lang(43) . "</i>" : "");
			$default = h($field["default"]);
			echo (isset($field["default"]) ? " <span title='" . lang(44) . "'>[<b>" . ($field["generated"] ? "<code class='jush-" . JUSH . "'>$default</code>" : $default) . "</b>]</span>" : "");
			echo (support("comment") ? "<td>" . h($field["comment"]) : "");
			echo "\n";
		}
		echo "</table>\n";
		echo "</div>\n";
	}

	/** Print list of indexes on table in tabular format
	* @param Index[] $indexes
	* @param TableStatus $tableStatus
	*/
	function tableIndexesPrint(array $indexes, array $tableStatus) {
		$partial = false;
		foreach ($indexes as $name => $index) {
			$partial |= !!$index["partial"];
		}
		echo "<table>\n";
		$default_algorithm = first(driver()->indexAlgorithms($tableStatus));
		foreach ($indexes as $name => $index) {
			ksort($index["columns"]); // enforce correct columns order
			$print = array();
			foreach ($index["columns"] as $key => $val) {
				$print[] = "<i>" . h($val) . "</i>"
					. ($index["lengths"][$key] ? "(" . $index["lengths"][$key] . ")" : "")
					. ($index["descs"][$key] ? " DESC" : "")
				;
			}

			echo "<tr title='" . h($name) . "'>";
			echo "<th>$index[type]" . ($default_algorithm && $index['algorithm'] != $default_algorithm ? " ($index[algorithm])" : "");
			echo "<td>" . implode(", ", $print);
			if ($partial) {
				echo "<td>" . ($index['partial'] ? "<code class='jush-" . JUSH . "'>WHERE " . h($index['partial']) : "");
			}
			echo "\n";
		}
		echo "</table>\n";
	}

	/** Print columns box in select
	* @param list<string> $select result of selectColumnsProcess()[0]
	* @param string[] $columns selectable columns
	*/
	function selectColumnsPrint(array $select, array $columns) {
		print_fieldset("select", lang(45), $select);
		$i = 0;
		$select[""] = array();
		foreach ($select as $key => $val) {
			$val = idx($_GET["columns"], $key, array());
			$column = select_input(
				" name='columns[$i][col]'",
				$columns,
				$val["col"],
				($key !== "" ? "selectFieldChange" : "selectAddRow")
			);
			echo "<div>" . (driver()->functions || driver()->grouping ? html_select("columns[$i][fun]", array(-1 => "") + array_filter(array(lang(46) => driver()->functions, lang(47) => driver()->grouping)), $val["fun"])
				. on_help("event.target.value && event.target.value.replace(/ |\$/, '(') + ')'", 1)
				. script("qsl('select').onchange = function () { helpClose();" . ($key !== "" ? "" : " qsl('select, input', this.parentNode).onchange();") . " };", "")
				. "($column)" : $column) . "</div>\n";
			$i++;
		}
		echo "</div></fieldset>\n";
	}

	/** Print search box in select
	* @param list<string> $where result of selectSearchProcess()
	* @param string[] $columns selectable columns
	* @param Index[] $indexes
	*/
	function selectSearchPrint(array $where, array $columns, array $indexes) {
		print_fieldset("search", lang(48), $where);
		foreach ($indexes as $i => $index) {
			if ($index["type"] == "FULLTEXT") {
				echo "<div>(<i>" . implode("</i>, <i>", array_map('Adminer\h', $index["columns"])) . "</i>) AGAINST";
				echo " <input type='search' name='fulltext[$i]' value='" . h(idx($_GET["fulltext"], $i)) . "'>";
				echo script("qsl('input').oninput = selectFieldChange;", "");
				echo (JUSH == 'sql' ? checkbox("boolean[$i]", 1, isset($_GET["boolean"][$i]), "BOOL") : '');
				echo "</div>\n";
			}
		}
		$change_next = "this.parentNode.firstChild.onchange();";
		foreach (array_merge((array) $_GET["where"], array(array())) as $i => $val) {
			if (!$val || ("$val[col]$val[val]" != "" && in_array($val["op"], adminer()->operators()))) {
				echo "<div>" . select_input(
					" name='where[$i][col]'",
					$columns,
					$val["col"],
					($val ? "selectFieldChange" : "selectAddRow"),
					"(" . lang(49) . ")"
				);
				echo html_select("where[$i][op]", adminer()->operators(), $val["op"], $change_next);
				echo "<input type='search' name='where[$i][val]' value='" . h($val["val"]) . "'>";
				echo script("mixin(qsl('input'), {oninput: function () { $change_next }, onkeydown: selectSearchKeydown, onsearch: selectSearchSearch});", "");
				echo "</div>\n";
			}
		}
		echo "</div></fieldset>\n";
	}

	/** Print order box in select
	* @param list<string> $order result of selectOrderProcess()
	* @param string[] $columns selectable columns
	* @param Index[] $indexes
	*/
	function selectOrderPrint(array $order, array $columns, array $indexes) {
		print_fieldset("sort", lang(50), $order);
		$i = 0;
		foreach ((array) $_GET["order"] as $key => $val) {
			if ($val != "") {
				echo "<div>" . select_input(" name='order[$i]'", $columns, $val, "selectFieldChange");
				echo checkbox("desc[$i]", 1, isset($_GET["desc"][$key]), lang(51)) . "</div>\n";
				$i++;
			}
		}
		echo "<div>" . select_input(" name='order[$i]'", $columns, "", "selectAddRow");
		echo checkbox("desc[$i]", 1, false, lang(51)) . "</div>\n";
		echo "</div></fieldset>\n";
	}

	/** Print limit box in select */
	function selectLimitPrint($limit) {
		echo "<fieldset><legend>" . lang(52) . "</legend><div>"; // <div> for easy styling
		echo "<input type='number' name='limit' class='size' value='" . intval($limit) . "'>";
		echo script("qsl('input').oninput = selectFieldChange;", "");
		echo "</div></fieldset>\n";
	}

	/** Print text length box in select
	* @param numeric-string $text_length result of selectLengthProcess()
	*/
	function selectLengthPrint($text_length) {
		if ($text_length !== null) {
			echo "<fieldset><legend>" . lang(53) . "</legend><div>";
			echo "<input type='number' name='text_length' class='size' value='" . h($text_length) . "'>";
			echo "</div></fieldset>\n";
		}
	}

	/** Print action box in select
	* @param Index[] $indexes
	*/
	function selectActionPrint(array $indexes) {
		echo "<fieldset><legend>" . lang(54) . "</legend><div>";
		echo "<input type='submit' value='" . lang(45) . "'>";
		echo " <span id='noindex' title='" . lang(55) . "'></span>";
		echo "<script" . nonce() . ">\n";
		echo "const indexColumns = ";
		$columns = array();
		foreach ($indexes as $index) {
			$current_key = reset($index["columns"]);
			if ($index["type"] != "FULLTEXT" && $current_key) {
				$columns[$current_key] = 1;
			}
		}
		$columns[""] = 1;
		foreach ($columns as $key => $val) {
			json_row($key);
		}
		echo ";\n";
		echo "selectFieldChange.call(qs('#form')['select']);\n";
		echo "</script>\n";
		echo "</div></fieldset>\n";
	}

	/** Print command box in select
	* @return bool whether to print default commands
	*/
	function selectCommandPrint() {
		return !information_schema(DB);
	}

	/** Print import box in select
	* @return bool whether to print default import
	*/
	function selectImportPrint() {
		return !information_schema(DB);
	}

	/** Print extra text in the end of a select form
	* @param string[] $emailFields fields holding e-mails
	* @param string[] $columns selectable columns
	*/
	function selectEmailPrint(array $emailFields, array $columns) {
	}

	/** Process columns box in select
	* @param string[] $columns selectable columns
	* @param Index[] $indexes
	* @return list<list<string>> [[select_expressions], [group_expressions]]
	*/
	function selectColumnsProcess(array $columns, array $indexes) {
		$select = array(); // select expressions, empty for *
		$group = array(); // expressions without aggregation - will be used for GROUP BY if an aggregation function is used
		foreach ((array) $_GET["columns"] as $key => $val) {
			if ($val["fun"] == "count" || ($val["col"] != "" && (!$val["fun"] || in_array($val["fun"], driver()->functions) || in_array($val["fun"], driver()->grouping)))) {
				$select[$key] = apply_sql_function($val["fun"], ($val["col"] != "" ? idf_escape($val["col"]) : "*"));
				if (!in_array($val["fun"], driver()->grouping)) {
					$group[] = $select[$key];
				}
			}
		}
		return array($select, $group);
	}

	/** Process search box in select
	* @param Field[] $fields
	* @param Index[] $indexes
	* @return list<string> expressions to join by AND
	*/
	function selectSearchProcess(array $fields, array $indexes) {
		$return = array();
		foreach ($indexes as $i => $index) {
			if ($index["type"] == "FULLTEXT" && idx($_GET["fulltext"], $i) != "") {
				$return[] = "MATCH (" . implode(", ", array_map('Adminer\idf_escape', $index["columns"])) . ") AGAINST (" . q($_GET["fulltext"][$i]) . (isset($_GET["boolean"][$i]) ? " IN BOOLEAN MODE" : "") . ")";
			}
		}
		foreach ((array) $_GET["where"] as $key => $val) {
			$col = $val["col"];
			if ("$col$val[val]" != "" && in_array($val["op"], adminer()->operators())) {
				$conds = array();
				foreach (($col != "" ? array($col => $fields[$col]) : $fields) as $name => $field) {
					$prefix = "";
					$cond = " $val[op]";
					if (preg_match('~IN$~', $val["op"])) {
						$in = process_length($val["val"]);
						$cond .= " " . ($in != "" ? $in : "(NULL)");
					} elseif ($val["op"] == "SQL") {
						$cond = " $val[val]"; // SQL injection
					} elseif (preg_match('~^(I?LIKE) %%$~', $val["op"], $match)) {
						$cond = " $match[1] " . adminer()->processInput($field, "%$val[val]%");
					} elseif ($val["op"] == "FIND_IN_SET") {
						$prefix = "$val[op](" . q($val["val"]) . ", ";
						$cond = ")";
					} elseif (!preg_match('~NULL$~', $val["op"])) {
						$cond .= " " . adminer()->processInput($field, $val["val"]);
					}
					if ($col != "" || ( // find anywhere
						isset($field["privileges"]["where"])
						&& (preg_match('~^[-\d.' . (preg_match('~IN$~', $val["op"]) ? ',' : '') . ']+$~', $val["val"]) || !preg_match('~' . number_type() . '|bit~', $field["type"]))
						&& (!preg_match("~[\x80-\xFF]~", $val["val"]) || preg_match('~char|text|enum|set~', $field["type"]))
						&& (!preg_match('~date|timestamp~', $field["type"]) || preg_match('~^\d+-\d+-\d+~', $val["val"]))
					)) {
						$conds[] = $prefix . driver()->convertSearch(idf_escape($name), $val, $field) . $cond;
					}
				}
				$return[] =
					(count($conds) == 1 ? $conds[0] :
					($conds ? "(" . implode(" OR ", $conds) . ")" :
					"1 = 0"
				));
			}
		}
		return $return;
	}

	/** Process order box in select
	* @param Field[] $fields
	* @param Index[] $indexes
	* @return list<string> expressions to join by comma
	*/
	function selectOrderProcess(array $fields, array $indexes) {
		$return = array();
		foreach ((array) $_GET["order"] as $key => $val) {
			if ($val != "") {
				$return[] = (preg_match('~^((COUNT\(DISTINCT |[A-Z0-9_]+\()(`(?:[^`]|``)+`|"(?:[^"]|"")+")\)|COUNT\(\*\))$~', $val) ? $val : idf_escape($val)) //! MS SQL uses []
					. (isset($_GET["desc"][$key]) ? " DESC" : "")
				;
			}
		}
		return $return;
	}

	/** Process limit box in select */
	function selectLimitProcess() {
		return (isset($_GET["limit"]) ? intval($_GET["limit"]) : 50);
	}

	/** Process length box in select
	* @return numeric-string number of characters to shorten texts, will be escaped, empty string means unlimited
	*/
	function selectLengthProcess() {
		return (isset($_GET["text_length"]) ? "$_GET[text_length]" : "100");
	}

	/** Process extras in select form
	* @param string[] $where AND conditions
	* @param list<ForeignKey>[] $foreignKeys
	* @return bool true if processed, false to process other parts of form
	*/
	function selectEmailProcess(array $where, array $foreignKeys) {
		return false;
	}

	/** Build SQL query used in select
	* @param list<string> $select result of selectColumnsProcess()[0]
	* @param list<string> $where result of selectSearchProcess()
	* @param list<string> $group result of selectColumnsProcess()[1]
	* @param list<string> $order result of selectOrderProcess()
	* @param int $limit result of selectLimitProcess()
	* @param int $page index of page starting at zero
	* @return string empty string to use default query
	*/
	function selectQueryBuild(array $select, array $where, array $group, array $order, $limit, $page) {
		return "";
	}

	/** Query printed after execution in the message
	* @param string $query executed query
	* @param string $time elapsed time
	*/
	function messageQuery($query, $time, $failed = false) {
		restart_session();
		$history = &get_session("queries");
		if (!idx($history, $_GET["db"])) {
			$history[$_GET["db"]] = array();
		}
		if (strlen($query) > 1e6) {
			$query = preg_replace('~[\x80-\xFF]+$~', '', substr($query, 0, 1e6)) . "\n…"; // [\x80-\xFF] - valid UTF-8, \n - can end by one-line comment
		}
		$history[$_GET["db"]][] = array($query, time(), $time); // not DB - $_GET["db"] is changed in database.inc.php //! respect $_GET["ns"]
		$sql_id = "sql-" . count($history[$_GET["db"]]);
		$return = "<a href='#$sql_id' class='toggle'>" . lang(56) . "</a> <a href='' class='jsonly copy'>🗐</a>\n";
		if (!$failed && ($warnings = driver()->warnings())) {
			$id = "warnings-" . count($history[$_GET["db"]]);
			$return = "<a href='#$id' class='toggle'>" . lang(38) . "</a>, $return<div id='$id' class='hidden'>\n$warnings</div>\n";
		}
		return " <span class='time'>" . @date("H:i:s") . "</span>" // @ - time zone may be not set
			. " $return<div id='$sql_id' class='hidden'><pre><code class='jush-" . JUSH . "'>" . shorten_utf8($query, 1e4) . "</code></pre>"
			. ($time ? " <span class='time'>($time)</span>" : '')
			. (support("sql") ? '<p><a href="' . h(str_replace("db=" . urlencode(DB), "db=" . urlencode($_GET["db"]), ME) . 'sql=&history=' . (count($history[$_GET["db"]]) - 1)) . '">' . lang(12) . '</a>' : '')
			. '</div>'
		;
	}

	/** Print before edit form
	* @param Field[] $fields
	* @param mixed $row
	*/
	function editRowPrint($table, array $fields, $row, $update) {
	}

	/** Functions displayed in edit form
	* @param Field|array{null:bool} $field
	* @return string[]
	*/
	function editFunctions(array $field) {
		$return = ($field["null"] ? "NULL/" : "");
		$update = isset($_GET["select"]) || where($_GET);
		foreach (array(driver()->insertFunctions, driver()->editFunctions) as $key => $functions) {
			if (!$key || (!isset($_GET["call"]) && $update)) { // relative functions
				foreach ($functions as $pattern => $val) {
					if (!$pattern || preg_match("~$pattern~", $field["type"])) {
						$return .= "/$val";
					}
				}
			}
			if ($key && $functions && !preg_match('~set|bool~', $field["type"]) && !is_blob($field)) {
				$return .= "/SQL";
			}
		}
		if ($field["auto_increment"] && !$update) {
			$return = lang(43);
		}
		return explode("/", $return);
	}

	/** Get options to display edit field
	* @param ?string $table null in call.inc.php
	* @param Field $field
	* @param string $attrs attributes to use inside the tag
	* @param string|string[]|false|null $value false means original value
	* @return string custom input field or empty string for default
	*/
	function editInput($table, array $field, $attrs, $value) {
		if ($field["type"] == "enum") {
			return (isset($_GET["select"]) ? "<label><input type='radio'$attrs value='orig' checked><i>" . lang(10) . "</i></label> " : "")
				. enum_input("radio", $attrs, $field, $value, "NULL")
			;
		}
		return "";
	}

	/** Get hint for edit field
	* @param ?string $table null in call.inc.php
	* @param Field $field
	*/
	function editHint($table, array $field, $value) {
		return "";
	}

	/** Process sent input
	* @param Field $field
	* @return string expression to use in a query
	*/
	function processInput(array $field, $value, $function = "") {
		if ($function == "SQL") {
			return $value; // SQL injection
		}
		$name = $field["field"];
		$return = q($value);
		if (preg_match('~^(now|getdate|uuid)$~', $function)) {
			$return = "$function()";
		} elseif (preg_match('~^current_(date|timestamp)$~', $function)) {
			$return = $function;
		} elseif (preg_match('~^([+-]|\|\|)$~', $function)) {
			$return = idf_escape($name) . " $function $return";
		} elseif (preg_match('~^[+-] interval$~', $function)) {
			$return = idf_escape($name) . " $function " . (preg_match("~^(\\d+|'[0-9.: -]') [A-Z_]+\$~i", $value) && JUSH != "pgsql" ? $value : $return);
		} elseif (preg_match('~^(addtime|subtime|concat)$~', $function)) {
			$return = "$function(" . idf_escape($name) . ", $return)";
		} elseif (preg_match('~^(md5|sha1|password|encrypt)$~', $function)) {
			$return = "$function($return)";
		}
		return unconvert_field($field, $return);
	}

	/** Return export output options
	* @return string[]
	*/
	function dumpOutput() {
		$return = array('text' => lang(57), 'file' => lang(58));
		if (function_exists('gzencode')) {
			$return['gz'] = 'gzip';
		}
		return $return;
	}

	/** Return export format options
	* @return string[] empty to disable export
	*/
	function dumpFormat() {
		return (support("dump") ? array('sql' => 'SQL') : array()) + array('csv' => 'CSV,', 'csv;' => 'CSV;', 'tsv' => 'TSV');
	}

	/** Export database structure
	* @return void prints data
	*/
	function dumpDatabase($db) {
	}

	/** Export table structure
	* @param int $is_view 0 table, 1 view, 2 temporary view table
	* @return void prints data
	*/
	function dumpTable($table, $style, $is_view = 0) {
		if ($_POST["format"] != "sql") {
			echo "\xef\xbb\xbf"; // UTF-8 byte order mark
			if ($style) {
				dump_csv(array_keys(fields($table)));
			}
		} else {
			if ($is_view == 2) {
				$fields = array();
				foreach (fields($table) as $name => $field) {
					$fields[] = idf_escape($name) . " $field[full_type]";
				}
				$create = "CREATE TABLE " . table($table) . " (" . implode(", ", $fields) . ")";
			} else {
				$create = create_sql($table, $_POST["auto_increment"], $style);
			}
			set_utf8mb4($create);
			if ($style && $create) {
				if ($style == "DROP+CREATE" || $is_view == 1) {
					echo "DROP " . ($is_view == 2 ? "VIEW" : "TABLE") . " IF EXISTS " . table($table) . ";\n";
				}
				if ($is_view == 1) {
					$create = remove_definer($create);
				}
				echo "$create;\n\n";
			}
		}
	}

	/** Export table data
	* @return void prints data
	*/
	function dumpData($table, $style, $query) {
		if ($style) {
			$max_packet = (JUSH == "sqlite" ? 0 : 1048576); // default, minimum is 1024
			$fields = array();
			$identity_insert = false;
			if ($_POST["format"] == "sql") {
				if ($style == "TRUNCATE+INSERT") {
					echo truncate_sql($table) . ";\n";
				}
				$fields = fields($table);
				if (JUSH == "mssql") {
					foreach ($fields as $field) {
						if ($field["auto_increment"]) {
							echo "SET IDENTITY_INSERT " . table($table) . " ON;\n";
							$identity_insert = true;
							break;
						}
					}
				}
			}
			$result = connection()->query($query, 1); // 1 - MYSQLI_USE_RESULT
			if ($result) {
				$insert = "";
				$buffer = "";
				$keys = array();
				$generated = array();
				$suffix = "";
				$fetch_function = ($table != '' ? 'fetch_assoc' : 'fetch_row');
				$count = 0;
				while ($row = $result->$fetch_function()) {
					if (!$keys) {
						$values = array();
						foreach ($row as $val) {
							$field = $result->fetch_field();
							if (idx($fields[$field->name], 'generated')) {
								$generated[$field->name] = true;
								continue;
							}
							$keys[] = $field->name;
							$key = idf_escape($field->name);
							$values[] = "$key = VALUES($key)";
						}
						$suffix = ($style == "INSERT+UPDATE" ? "\nON DUPLICATE KEY UPDATE " . implode(", ", $values) : "") . ";\n";
					}
					if ($_POST["format"] != "sql") {
						if ($style == "table") {
							dump_csv($keys);
							$style = "INSERT";
						}
						dump_csv($row);
					} else {
						if (!$insert) {
							$insert = "INSERT INTO " . table($table) . " (" . implode(", ", array_map('Adminer\idf_escape', $keys)) . ") VALUES";
						}
						foreach ($row as $key => $val) {
							if ($generated[$key]) {
								unset($row[$key]);
								continue;
							}
							$field = $fields[$key];
							$row[$key] = ($val !== null
								? unconvert_field($field, preg_match(number_type(), $field["type"]) && !preg_match('~\[~', $field["full_type"]) && is_numeric($val) ? $val : q(($val === false ? 0 : $val)))
								: "NULL"
							);
						}
						$s = ($max_packet ? "\n" : " ") . "(" . implode(",\t", $row) . ")";
						if (!$buffer) {
							$buffer = $insert . $s;
						} elseif (JUSH == 'mssql'
							? $count % 1000 != 0 // https://learn.microsoft.com/en-us/sql/t-sql/queries/table-value-constructor-transact-sql#limitations-and-restrictions
							: strlen($buffer) + 4 + strlen($s) + strlen($suffix) < $max_packet // 4 - length specification
						) {
							$buffer .= ",$s";
						} else {
							echo $buffer . $suffix;
							$buffer = $insert . $s;
						}
					}
					$count++;
				}
				if ($buffer) {
					echo $buffer . $suffix;
				}
			} elseif ($_POST["format"] == "sql") {
				echo "-- " . str_replace("\n", " ", connection()->error) . "\n";
			}
			if ($identity_insert) {
				echo "SET IDENTITY_INSERT " . table($table) . " OFF;\n";
			}
		}
	}

	/** Set export filename
	* @return string filename without extension
	*/
	function dumpFilename($identifier) {
		return friendly_url($identifier != "" ? $identifier : (SERVER ?: "localhost"));
	}

	/** Send headers for export
	* @return string extension
	*/
	function dumpHeaders($identifier, $multi_table = false) {
		$output = $_POST["output"];
		$ext = (preg_match('~sql~', $_POST["format"]) ? "sql" : ($multi_table ? "tar" : "csv")); // multiple CSV packed to TAR
		header("Content-Type: " .
			($output == "gz" ? "application/x-gzip" :
			($ext == "tar" ? "application/x-tar" :
			($ext == "sql" || $output != "file" ? "text/plain" : "text/csv") . "; charset=utf-8"
		)));
		if ($output == "gz") {
			ob_start(function ($string) {
				// ob_start() callback receives an optional parameter $phase but gzencode() accepts optional parameter $level
				return gzencode($string);
			}, 1e6);
		}
		return $ext;
	}

	/** Print text after export
	* @return void prints data
	*/
	function dumpFooter() {
		if ($_POST["format"] == "sql") {
			echo "-- " . gmdate("Y-m-d H:i:s e") . "\n";
		}
	}

	/** Set the path of the file for webserver load
	* @return string path of the sql dump file
	*/
	function importServerPath() {
		return "adminer.sql";
	}

	/** Print homepage
	* @return bool whether to print default homepage
	*/
	function homepage() {
		echo '<p class="links">' . ($_GET["ns"] == "" && support("database") ? '<a href="' . h(ME) . 'database=">' . lang(59) . "</a>\n" : "");
		echo (support("scheme") ? "<a href='" . h(ME) . "scheme='>" . ($_GET["ns"] != "" ? lang(60) : lang(61)) . "</a>\n" : "");
		echo ($_GET["ns"] !== "" ? '<a href="' . h(ME) . 'schema=">' . lang(62) . "</a>\n" : "");
		echo (support("privileges") ? "<a href='" . h(ME) . "privileges='>" . lang(63) . "</a>\n" : "");
		if ($_GET["ns"] !== "") {
			echo (support("routine") ? "<a href='#routines'>" . lang(64) . "</a>\n" : "");
			echo (support("sequence") ? "<a href='#sequences'>" . lang(65) . "</a>\n" : "");
			echo (support("type") ? "<a href='#user-types'>" . lang(6) . "</a>\n" : "");
			echo (support("event") ? "<a href='#events'>" . lang(66) . "</a>\n" : "");
		}
		return true;
	}

	/** Print navigation after Adminer title
	* @param string $missing can be "auth" if there is no database connection, "db" if there is no database selected, "ns" with invalid schema
	*/
	function navigation($missing) {
		echo "<h1>" . adminer()->name() . " <span class='version'>" . VERSION;
		$new_version = $_COOKIE["adminer_version"];
		echo " <a href='https://www.adminer.org/#download'" . target_blank() . " id='version'>" . (version_compare(VERSION, $new_version) < 0 ? h($new_version) : "") . "</a>";
		echo "</span></h1>\n";
		// this is matched by compile.php
		switch_lang();
		if ($missing == "auth") {
			$output = "";
			foreach ((array) $_SESSION["pwds"] as $vendor => $servers) {
				foreach ($servers as $server => $usernames) {
					$name = h(get_setting("vendor-$vendor-$server") ?: get_driver($vendor));
					foreach ($usernames as $username => $password) {
						if ($password !== null) {
							$dbs = $_SESSION["db"][$vendor][$server][$username];
							foreach (($dbs ? array_keys($dbs) : array("")) as $db) {
								$output .= "<li><a href='" . h(auth_url($vendor, $server, $username, $db)) . "'>($name) " . h("$username@" . ($server != "" ? adminer()->serverName($server) : "") . ($db != "" ? " - $db" : "")) . "</a>\n";
							}
						}
					}
				}
			}
			if ($output) {
				echo "<ul id='logins'>\n$output</ul>\n" . script("mixin(qs('#logins'), {onmouseover: menuOver, onmouseout: menuOut});");
			}
		} else {
			$tables = array();
			if ($_GET["ns"] !== "" && !$missing && DB != "") {
				connection()->select_db(DB);
				$tables = table_status('', true);
			}
			adminer()->syntaxHighlighting($tables);
			adminer()->databasesPrint($missing);
			$actions = array();
			if (DB == "" || !$missing) {
				if (support("sql")) {
					$actions[] = "<a href='" . h(ME) . "sql='" . bold(isset($_GET["sql"]) && !isset($_GET["import"])) . ">" . lang(56) . "</a>";
					$actions[] = "<a href='" . h(ME) . "import='" . bold(isset($_GET["import"])) . ">" . lang(67) . "</a>";
				}
				$actions[] = "<a href='" . h(ME) . "dump=" . urlencode(isset($_GET["table"]) ? $_GET["table"] : $_GET["select"]) . "' id='dump'" . bold(isset($_GET["dump"])) . ">" . lang(68) . "</a>";
			}
			$in_db = $_GET["ns"] !== "" && !$missing && DB != "";
			if ($in_db && function_exists('Adminer\alter_table')) {
				$actions[] = '<a href="' . h(ME) . 'create="' . bold($_GET["create"] === "") . ">" . lang(69) . "</a>";
			}
			echo ($actions ? "<p class='links'>\n" . implode("\n", $actions) . "\n" : "");
			if ($in_db) {
				if ($tables) {
					adminer()->tablesPrint($tables);
				} else {
					echo "<p class='message'>" . lang(11) . "</p>\n";
				}
			}
		}
	}

	/** Set up syntax highlight for code and <textarea>
	* @param TableStatus[] $tables
	*/
	function syntaxHighlighting(array $tables) {
		// this is matched by compile.php
		echo script_src(preg_replace("~\\?.*~", "", ME) . "?file=jush.js&version=5.4.2", true);
		if (support("sql")) {
			echo "<script" . nonce() . ">\n";
			if ($tables) {
				$links = array();
				foreach ($tables as $table => $type) {
					$links[] = preg_quote($table, '/');
				}
				echo "var jushLinks = { " . JUSH . ":";
				json_row(js_escape(ME) . (support("table") ? "table" : "select") . '=$&', '/\b(' . implode('|', $links) . ')\b/g', false);
				if (support('routine')) {
					foreach (routines() as $row) {
						json_row(js_escape(ME) . 'function=' . urlencode($row["SPECIFIC_NAME"]) . '&name=$&', '/\b' . preg_quote($row["ROUTINE_NAME"], '/') . '(?=["`]?\()/g', false);
					}
				}
				json_row('');
				echo "};\n";
				foreach (array("bac", "bra", "sqlite_quo", "mssql_bra") as $val) {
					echo "jushLinks.$val = jushLinks." . JUSH . ";\n";
				}
				if (isset($_GET["sql"]) || isset($_GET["trigger"]) || isset($_GET["check"])) {
					$tablesColumns = array_fill_keys(array_keys($tables), array());
					foreach (driver()->allFields() as $table => $fields) {
						foreach ($fields as $field) {
							$tablesColumns[$table][] = $field["field"];
						}
					}
					echo "addEventListener('DOMContentLoaded', () => { autocompleter = jush.autocompleteSql('" . idf_escape("") . "', " . json_encode($tablesColumns) . "); });\n";
				}
			}
			echo "</script>\n";
		}
		echo script("syntaxHighlighting('" . preg_replace('~^(\d\.?\d).*~s', '\1', connection()->server_info) . "', '" . connection()->flavor . "');");
	}

	/** Print databases list in menu */
	function databasesPrint($missing) {
		$databases = adminer()->databases();
		if (DB && $databases && !in_array(DB, $databases)) {
			array_unshift($databases, DB);
		}
		echo "<form action=''>\n<p id='dbs'>\n";
		hidden_fields_get();
		$db_events = script("mixin(qsl('select'), {onmousedown: dbMouseDown, onchange: dbChange});");
		echo "<label title='" . lang(29) . "'>" . lang(70) . ": " . ($databases
			? html_select("db", array("" => "") + $databases, DB) . $db_events
			: "<input name='db' value='" . h(DB) . "' autocapitalize='off' size='19'>\n"
		) . "</label>";
		echo "<input type='submit' value='" . lang(22) . "'" . ($databases ? " class='hidden'" : "") . ">\n";

		foreach (array("import", "sql", "schema", "dump", "privileges") as $val) {
			if (isset($_GET[$val])) {
				echo input_hidden($val);
				break;
			}
		}
		echo "</p></form>\n";
	}

	/** Print table list in menu
	* @param TableStatus[] $tables
	*/
	function tablesPrint(array $tables) {
		echo "<ul id='tables'>" . script("mixin(qs('#tables'), {onmouseover: menuOver, onmouseout: menuOut});");
		foreach ($tables as $table => $status) {
			$table = "$table"; // do not highlight "0" as active everywhere
			$name = adminer()->tableName($status);
			if ($name != "" && !$status["partition"]) {
				echo '<li><a href="' . h(ME) . 'select=' . urlencode($table) . '"'
					. bold($_GET["select"] == $table || $_GET["edit"] == $table, "select")
					. " title='" . lang(33) . "'>" . lang(71) . "</a> "
				;
				echo (support("table") || support("indexes")
					? '<a href="' . h(ME) . 'table=' . urlencode($table) . '"'
						. bold(in_array($table, array($_GET["table"], $_GET["create"], $_GET["indexes"], $_GET["foreign"], $_GET["trigger"], $_GET["check"], $_GET["view"])), (is_view($status) ? "view" : "structure"))
						. " title='" . lang(34) . "'>$name</a>"
					: "<span>$name</span>"
				) . "\n";
			}
		}
		echo "</ul>\n";
	}

	/** Get server variables
	* @return list<string[]> [[$name, $value]]
	*/
	function showVariables() {
		return show_variables();
	}

	/** Get status variables
	* @return list<string[]> [[$name, $value]]
	*/
	function showStatus() {
		return show_status();
	}

	/** Get process list
	* @return list<string[]> [$row]
	*/
	function processList() {
		return process_list();
	}

	/** Kill a process
	* @param numeric-string $id
	* @return Result|bool
	*/
	function killProcess($id) {
		return kill_process($id);
	}
}

class Plugins {
	/** @var true[] */ private static $append = array('dumpFormat' => true, 'dumpOutput' => true, 'editRowPrint' => true, 'editFunctions' => true, 'config' => true); // these hooks expect the value to be appended to the result

	/** @var list<object> @visibility protected(set) */ public $plugins;
	/** @visibility protected(set) */ public $error = ''; // HTML
	/** @var list<object>[] */ private $hooks = array();

	/** Register plugins
	* @param ?list<object> $plugins object instances or null to autoload plugins from adminer-plugins/
	*/
	function __construct($plugins) {
		if ($plugins === null) {
			$plugins = array();
			$basename = "adminer-plugins";
			if (is_dir($basename)) {
				foreach (glob("$basename/*.php") as $filename) {
					$this->includeOnce($filename);
				}
			}
			$help = " href='https://www.adminer.org/plugins/#use'" . target_blank();
			if (file_exists("$basename.php")) {
				$include = $this->includeOnce("$basename.php"); // example: return array(new AdminerLoginOtp($secret));
				if (is_array($include)) {
					foreach ($include as $plugin) {
						$plugins[get_class($plugin)] = $plugin;
					}
				} else {
					$this->error .= lang(72, "<b>$basename.php</b>", $help) . "<br>";
				}
			}
			foreach (get_declared_classes() as $class) {
				if (!$plugins[$class] && (preg_match('~^Adminer\w~i', $class) || is_subclass_of($class, 'Adminer\Plugin'))) {
					// we need to use reflection because PHP 7.1 throws ArgumentCountError for missing arguments but older versions issue a warning
					$reflection = new \ReflectionClass($class);
					$constructor = $reflection->getConstructor();
					if ($constructor && $constructor->getNumberOfRequiredParameters()) {
						$this->error .= lang(73, $help, "<b>$class</b>", "<b>$basename.php</b>") . "<br>";
					} else {
						$plugins[$class] = new $class;
					}
				}
			}
		}
		$this->plugins = $plugins;

		$adminer = new Adminer;
		$plugins[] = $adminer;
		$reflection = new \ReflectionObject($adminer);
		foreach ($reflection->getMethods() as $method) {
			foreach ($plugins as $plugin) {
				$name = $method->getName();
				if (method_exists($plugin, $name)) {
					$this->hooks[$name][] = $plugin;
				}
			}
		}
	}

	/** Separate function to not overwrite local variables
	* @return array<object>|true
	*/
	function includeOnce($filename) {
		return include_once "./$filename";
	}

	/**
	* @param literal-string $name
	* @param mixed[] $params
	* @return mixed
	*/
	function __call($name, array $params) {
		$args = array();
		foreach ($params as $key => $val) {
			// some plugins accept params by reference - we don't need to propagate it outside, just to the other plugins
			$args[] = &$params[$key];
		}
		$return = null;
		foreach ($this->hooks[$name] as $plugin) {
			$value = call_user_func_array(array($plugin, $name), $args);
			if ($value !== null) {
				if (!self::$append[$name]) { // non-null value from non-appending method short-circuits the other plugins
					return $value;
				}
				$return = $value + (array) $return;
			}
		}
		return $return;
	}
}

// the overridable methods don't use return type declarations so that plugins can be compatible with PHP 5
abstract class Plugin {
	/** @var array<literal-string, string|list<string>>[] */ protected $translations = array(); // key is language code

	/** Get plain text plugin description; empty string means to use the first line of class doc-comment
	* @return string
	*/
	function description() {
		return $this->lang('');
	}

	/** Get URL of plugin screenshot
	* @return string
	*/
	function screenshot() {
		return "";
	}

	/** Translate a string from $this->translations; Adminer\lang() doesn't work for single language versions
	* @param literal-string $idf
	* @param float|string $number
	*/
	protected function lang($idf, $number = null) {
		$args = func_get_args();
		$args[0] = idx($this->translations[LANG], $idf) ?: $idf;
		return call_user_func_array('Adminer\lang_format', $args);
	}
}


Adminer::$instance =
	(function_exists('adminer_object') ? adminer_object() :
	(is_dir("adminer-plugins") || file_exists("adminer-plugins.php") ? new Plugins(null) :
	new Adminer
));

// this is matched by compile.php
SqlDriver::$drivers = array("server" => "MySQL / MariaDB") + SqlDriver::$drivers;

if (!defined('Adminer\DRIVER')) {
	define('Adminer\DRIVER', "server"); // server - backwards compatibility

	// MySQLi supports everything, MySQL doesn't support multiple result sets, PDO_MySQL doesn't support orgtable
	if (extension_loaded("mysqli") && $_GET["ext"] != "pdo") {
		class Db extends \MySQLi {
			/** @var Db */ static $instance;
			public $extension = "MySQLi", $flavor = '';

			function __construct() {
				parent::init();
			}

			function attach($server, $username, $password) {
				mysqli_report(MYSQLI_REPORT_OFF); // stays between requests, not required since PHP 5.3.4
				list($host, $port) = host_port($server);
				$ssl = adminer()->connectSsl();
				if ($ssl) {
					$this->ssl_set($ssl['key'], $ssl['cert'], $ssl['ca'], '', '');
				}
				$return = @$this->real_connect(
					($server != "" ? $host : ini_get("mysqli.default_host")),
					($server . $username != "" ? $username : ini_get("mysqli.default_user")),
					($server . $username . $password != "" ? $password : ini_get("mysqli.default_pw")),
					null,
					(is_numeric($port) ? intval($port) : ini_get("mysqli.default_port")),
					(is_numeric($port) ? null : $port),
					($ssl ? ($ssl['verify'] !== false ? 2048 : 64) : 0) // 2048 - MYSQLI_CLIENT_SSL, 64 - MYSQLI_CLIENT_SSL_DONT_VERIFY_SERVER_CERT (not available before PHP 5.6.16)
				);
				$this->options(MYSQLI_OPT_LOCAL_INFILE, 0);
				return ($return ? '' : $this->error);
			}

			function set_charset($charset) {
				if (parent::set_charset($charset)) {
					return true;
				}
				// the client library may not support utf8mb4
				parent::set_charset('utf8');
				return $this->query("SET NAMES $charset");
			}

			function next_result() {
				return self::more_results() && parent::next_result(); // triggers E_STRICT on PHP < 7.4 otherwise
			}

			function quote($string) {
				return "'" . $this->escape_string($string) . "'";
			}
		}

	} elseif (extension_loaded("mysql") && !((ini_bool("sql.safe_mode") || ini_bool("mysql.allow_local_infile")) && extension_loaded("pdo_mysql"))) {
		class Db extends SqlDb {
			/** @var resource */ private $link;

			function attach($server, $username, $password) {
				if (ini_bool("mysql.allow_local_infile")) {
					return lang(74, "'mysql.allow_local_infile'", "MySQLi", "PDO_MySQL");
				}
				$this->link = @mysql_connect(
					($server != "" ? $server : ini_get("mysql.default_host")),
					($server . $username != "" ? $username : ini_get("mysql.default_user")),
					($server . $username . $password != "" ? $password : ini_get("mysql.default_password")),
					true,
					131072 // CLIENT_MULTI_RESULTS for CALL
				);
				if (!$this->link) {
					return mysql_error();
				}
				$this->server_info = mysql_get_server_info($this->link);
				return '';
			}

			/** Set the client character set */
			function set_charset($charset) {
				if (function_exists('mysql_set_charset')) {
					if (mysql_set_charset($charset, $this->link)) {
						return true;
					}
					// the client library may not support utf8mb4
					mysql_set_charset('utf8', $this->link);
				}
				return $this->query("SET NAMES $charset");
			}

			function quote($string) {
				return "'" . mysql_real_escape_string($string, $this->link) . "'";
			}

			function select_db($database) {
				return mysql_select_db($database, $this->link);
			}

			function query($query, $unbuffered = false) {
				$result = @($unbuffered ? mysql_unbuffered_query($query, $this->link) : mysql_query($query, $this->link)); // @ - mute mysql.trace_mode
				$this->error = "";
				if (!$result) {
					$this->errno = mysql_errno($this->link);
					$this->error = mysql_error($this->link);
					return false;
				}
				if ($result === true) {
					$this->affected_rows = mysql_affected_rows($this->link);
					$this->info = mysql_info($this->link);
					return true;
				}
				return new Result($result);
			}
		}

		class Result {
			public $num_rows; // number of rows in the result
			/** @var resource */ private $result;
			private $offset = 0;

			/** @param resource $result */
			function __construct($result) {
				$this->result = $result;
				$this->num_rows = mysql_num_rows($result);
			}

			/** Fetch next row as associative array
			* @return array<?string>|false
			*/
			function fetch_assoc() {
				return mysql_fetch_assoc($this->result);
			}

			/** Fetch next row as numbered array
			* @return list<?string>|false
			*/
			function fetch_row() {
				return mysql_fetch_row($this->result);
			}

			/** Fetch next field
			* @return \stdClass properties: name, type (0 number, 15 varchar, 254 char), charsetnr (63 binary); optionally: table, orgtable, orgname
			*/
			function fetch_field() {
				$return = mysql_fetch_field($this->result, $this->offset++); // offset required under certain conditions
				$return->orgtable = $return->table;
				$return->charsetnr = ($return->blob ? 63 : 0);
				return $return;
			}

			/** Free result set */
			function __destruct() {
				mysql_free_result($this->result);
			}
		}

	} elseif (extension_loaded("pdo_mysql")) {
		class Db extends PdoDb {
			public $extension = "PDO_MySQL";

			function attach($server, $username, $password) {
				$options = array(\PDO::MYSQL_ATTR_LOCAL_INFILE => false);
				$ssl = adminer()->connectSsl();
				if ($ssl) {
					if ($ssl['key']) {
						$options[\PDO::MYSQL_ATTR_SSL_KEY] = $ssl['key'];
					}
					if ($ssl['cert']) {
						$options[\PDO::MYSQL_ATTR_SSL_CERT] = $ssl['cert'];
					}
					if ($ssl['ca']) {
						$options[\PDO::MYSQL_ATTR_SSL_CA] = $ssl['ca'];
					}
					if (isset($ssl['verify'])) {
						$options[\PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = $ssl['verify'];
					}
				}
				list($host, $port) = host_port($server);
				return $this->dsn(
					"mysql:charset=utf8;host=$host" . ($port ? (is_numeric($port) ? ";port=" : ";unix_socket=") . $port : ""),
					$username,
					$password,
					$options
				);
			}

			function set_charset($charset) {
				return $this->query("SET NAMES $charset"); // charset in DSN is ignored before PHP 5.3.6
			}

			function select_db($database) {
				// database selection is separated from the connection so dbname in DSN can't be used
				return $this->query("USE " . idf_escape($database));
			}

			function query($query, $unbuffered = false) {
				$this->pdo->setAttribute(\PDO::MYSQL_ATTR_USE_BUFFERED_QUERY, !$unbuffered);
				return parent::query($query, $unbuffered);
			}
		}

	}



	class Driver extends SqlDriver {
		static $extensions = array("MySQLi", "MySQL", "PDO_MySQL");
		static $jush = "sql"; // JUSH identifier

		public $unsigned = array("unsigned", "zerofill", "unsigned zerofill");
		public $operators = array("=", "<", ">", "<=", ">=", "!=", "LIKE", "LIKE %%", "REGEXP", "IN", "FIND_IN_SET", "IS NULL", "NOT LIKE", "NOT REGEXP", "NOT IN", "IS NOT NULL", "SQL");
		public $functions = array("char_length", "date", "from_unixtime", "lower", "round", "floor", "ceil", "sec_to_time", "time_to_sec", "upper");
		public $grouping = array("avg", "count", "count distinct", "group_concat", "max", "min", "sum");

		static function connect($server, $username, $password) {
			$connection = parent::connect($server, $username, $password);
			if (is_string($connection)) {
				if (function_exists('iconv') && !is_utf8($connection) && strlen($s = iconv("windows-1250", "utf-8", $connection)) > strlen($connection)) { // windows-1250 - most common Windows encoding
					$connection = $s;
				}
				return $connection;
			}
			$connection->set_charset(charset($connection));
			$connection->query("SET sql_quote_show_create = 1, autocommit = 1");
			$connection->flavor = (preg_match('~MariaDB~', $connection->server_info) ? 'maria' : 'mysql');
			add_driver(DRIVER, ($connection->flavor == 'maria' ? "MariaDB" : "MySQL"));
			return $connection;
		}

		function __construct(Db $connection) {
			parent::__construct($connection);
			$this->types = array(
				lang(75) => array("tinyint" => 3, "smallint" => 5, "mediumint" => 8, "int" => 10, "bigint" => 20, "decimal" => 66, "float" => 12, "double" => 21),
				lang(76) => array("date" => 10, "datetime" => 19, "timestamp" => 19, "time" => 10, "year" => 4),
				lang(77) => array("char" => 255, "varchar" => 65535, "tinytext" => 255, "text" => 65535, "mediumtext" => 16777215, "longtext" => 4294967295),
				lang(78) => array("enum" => 65535, "set" => 64),
				lang(79) => array("bit" => 20, "binary" => 255, "varbinary" => 65535, "tinyblob" => 255, "blob" => 65535, "mediumblob" => 16777215, "longblob" => 4294967295),
				lang(80) => array("geometry" => 0, "point" => 0, "linestring" => 0, "polygon" => 0, "multipoint" => 0, "multilinestring" => 0, "multipolygon" => 0, "geometrycollection" => 0),
			);
			$this->insertFunctions = array(
				"char" => "md5/sha1/password/encrypt/uuid",
				"binary" => "md5/sha1",
				"date|time" => "now",
			);
			$this->editFunctions = array(
				number_type() => "+/-",
				"date" => "+ interval/- interval",
				"time" => "addtime/subtime",
				"char|text" => "concat",
			);
			if (min_version('5.7.8', 10.2, $connection)) {
				$this->types[lang(77)]["json"] = 4294967295;
			}
			if (min_version('', 10.7, $connection)) {
				$this->types[lang(77)]["uuid"] = 128;
				$this->insertFunctions['uuid'] = 'uuid';
			}
			if (min_version(9, '', $connection)) {
				$this->types[lang(75)]["vector"] = 16383;
				$this->insertFunctions['vector'] = 'string_to_vector';
			}
			if (min_version(5.1, '', $connection)) {
				$this->partitionBy = array("HASH", "LINEAR HASH", "KEY", "LINEAR KEY", "RANGE", "LIST");
			}
			if (min_version(5.7, 10.2, $connection)) {
				$this->generated = array("STORED", "VIRTUAL");
			}
		}

		function unconvertFunction(array $field) {
			return (preg_match("~binary~", $field["type"]) ? "<code class='jush-sql'>UNHEX</code>"
				: ($field["type"] == "bit" ? doc_link(array('sql' => 'bit-value-literals.html'), "<code>b''</code>")
				: (preg_match("~geometry|point|linestring|polygon~", $field["type"]) ? "<code class='jush-sql'>GeomFromText</code>"
				: "")));
		}

		function insert($table, array $set) {
			return ($set ? parent::insert($table, $set) : queries("INSERT INTO " . table($table) . " ()\nVALUES ()"));
		}

		function insertUpdate($table, array $rows, array $primary) {
			$columns = array_keys(reset($rows));
			$prefix = "INSERT INTO " . table($table) . " (" . implode(", ", $columns) . ") VALUES\n";
			$values = array();
			foreach ($columns as $key) {
				$values[$key] = "$key = VALUES($key)";
			}
			$suffix = "\nON DUPLICATE KEY UPDATE " . implode(", ", $values);
			$values = array();
			$length = 0;
			foreach ($rows as $set) {
				$value = "(" . implode(", ", $set) . ")";
				if ($values && (strlen($prefix) + $length + strlen($value) + strlen($suffix) > 1e6)) { // 1e6 - default max_allowed_packet
					if (!queries($prefix . implode(",\n", $values) . $suffix)) {
						return false;
					}
					$values = array();
					$length = 0;
				}
				$values[] = $value;
				$length += strlen($value) + 2; // 2 - strlen(",\n")
			}
			return queries($prefix . implode(",\n", $values) . $suffix);
		}

		function slowQuery($query, $timeout) {
			if (min_version('5.7.8', '10.1.2')) {
				if ($this->conn->flavor == 'maria') {
					return "SET STATEMENT max_statement_time=$timeout FOR $query";
				} elseif (preg_match('~^(SELECT\b)(.+)~is', $query, $match)) {
					return "$match[1] /*+ MAX_EXECUTION_TIME(" . ($timeout * 1000) . ") */ $match[2]";
				}
			}
		}

		function convertSearch($idf, array $val, array $field) {
			return (preg_match('~char|text|enum|set~', $field["type"]) && !preg_match("~^utf8~", $field["collation"]) && preg_match('~[\x80-\xFF]~', $val['val'])
				? "CONVERT($idf USING " . charset($this->conn) . ")"
				: $idf
			);
		}

		function warnings() {
			$result = $this->conn->query("SHOW WARNINGS");
			if ($result && $result->num_rows) {
				ob_start();
				print_select_result($result); // print_select_result() usually needs to print a big table progressively
				return ob_get_clean();
			}
		}

		function tableHelp($name, $is_view = false) {
			$maria = ($this->conn->flavor == 'maria');
			if (information_schema(DB)) {
				return strtolower("information-schema-" . ($maria ? "$name-table/" : str_replace("_", "-", $name) . "-table.html"));
			}
			if (DB == "mysql") {
				return ($maria ? "mysql$name-table/" : "system-schema.html"); //! more precise link
			}
		}

		function partitionsInfo($table) {
			$from = "FROM information_schema.PARTITIONS WHERE TABLE_SCHEMA = " . q(DB) . " AND TABLE_NAME = " . q($table);
			$result = $this->conn->query("SELECT PARTITION_METHOD, PARTITION_EXPRESSION, PARTITION_ORDINAL_POSITION $from ORDER BY PARTITION_ORDINAL_POSITION DESC LIMIT 1");
			$return = array();
			list($return["partition_by"], $return["partition"], $return["partitions"]) = $result->fetch_row();
			$partitions = get_key_vals("SELECT PARTITION_NAME, PARTITION_DESCRIPTION $from AND PARTITION_NAME != '' ORDER BY PARTITION_ORDINAL_POSITION");
			$return["partition_names"] = array_keys($partitions);
			$return["partition_values"] = array_values($partitions);
			return $return;
		}

		function hasCStyleEscapes() {
			static $c_style;
			if ($c_style === null) {
				$sql_mode = get_val("SHOW VARIABLES LIKE 'sql_mode'", 1, $this->conn);
				$c_style = (strpos($sql_mode, 'NO_BACKSLASH_ESCAPES') === false);
			}
			return $c_style;
		}

		function engines() {
			$return = array();
			foreach (get_rows("SHOW ENGINES") as $row) {
				if (preg_match("~YES|DEFAULT~", $row["Support"])) {
					$return[] = $row["Engine"];
				}
			}
			return $return;
		}

		function indexAlgorithms(array $tableStatus) {
			return (preg_match('~^(MEMORY|NDB)$~', $tableStatus["Engine"]) ? array("HASH", "BTREE") : array());
		}
	}



	/** Escape database identifier */
	function idf_escape($idf) {
		return "`" . str_replace("`", "``", $idf) . "`";
	}

	/** Get escaped table name */
	function table($idf) {
		return idf_escape($idf);
	}

	/** Get cached list of databases
	* @return list<string>
	*/
	function get_databases($flush) {
		// SHOW DATABASES can take a very long time so it is cached
		$return = get_session("dbs");
		if ($return === null) {
			$query = "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA ORDER BY SCHEMA_NAME"; // SHOW DATABASES can be disabled by skip_show_database
			$return = ($flush ? slow_query($query) : get_vals($query));
			restart_session();
			set_session("dbs", $return);
			stop_session();
		}
		return $return;
	}

	/** Formulate SQL query with limit
	* @param string $query everything after SELECT
	* @param string $where including WHERE
	*/
	function limit($query, $where, $limit, $offset = 0, $separator = " ") {
		return " $query$where" . ($limit ? $separator . "LIMIT $limit" . ($offset ? " OFFSET $offset" : "") : "");
	}

	/** Formulate SQL modification query with limit 1
	* @param string $query everything after UPDATE or DELETE
	*/
	function limit1($table, $query, $where, $separator = "\n") {
		return limit($query, $where, 1, 0, $separator);
	}

	/** Get database collation
	* @param string[][] $collations result of collations()
	*/
	function db_collation($db, array $collations) {
		$return = null;
		$create = get_val("SHOW CREATE DATABASE " . idf_escape($db), 1);
		if (preg_match('~ COLLATE ([^ ]+)~', $create, $match)) {
			$return = $match[1];
		} elseif (preg_match('~ CHARACTER SET ([^ ]+)~', $create, $match)) {
			// default collation
			$return = $collations[$match[1]][-1];
		}
		return $return;
	}

	/** Get logged user */
	function logged_user() {
		return get_val("SELECT USER()");
	}

	/** Get tables list
	* @return string[] [$name => $type]
	*/
	function tables_list() {
		return get_key_vals("SELECT TABLE_NAME, TABLE_TYPE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME");
	}

	/** Count tables in all databases
	* @param list<string> $databases
	* @return int[] [$db => $tables]
	*/
	function count_tables(array $databases) {
		$return = array();
		foreach ($databases as $db) {
			$return[$db] = count(get_vals("SHOW TABLES IN " . idf_escape($db)));
		}
		return $return;
	}

	/** Get table status
	* @param bool $fast return only "Name", "Engine" and "Comment" fields
	* @return array<string, TableStatus>
	*/
	function table_status($name = "", $fast = false) {
		$return = array();
		foreach (
			get_rows(
				$fast
				? "SELECT TABLE_NAME AS Name, ENGINE AS Engine, TABLE_COMMENT AS Comment FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() " . ($name != "" ? "AND TABLE_NAME = " . q($name) : "ORDER BY Name")
				: "SHOW TABLE STATUS" . ($name != "" ? " LIKE " . q(addcslashes($name, "%_\\")) : "")
			) as $row
		) {
			if ($row["Engine"] == "InnoDB") {
				// ignore internal comment, unnecessary since MySQL 5.1.21
				$row["Comment"] = preg_replace('~(?:(.+); )?InnoDB free: .*~', '\1', $row["Comment"]);
			}
			if (!isset($row["Engine"])) {
				$row["Comment"] = "";
			}
			if ($name != "") {
				// MariaDB: Table name is returned as lowercase on macOS, so we fix it here.
				$row["Name"] = $name;
			}
			$return[$row["Name"]] = $row;
		}
		return $return;
	}

	/** Find out whether the identifier is view
	* @param TableStatus $table_status
	*/
	function is_view(array $table_status) {
		return $table_status["Engine"] === null;
	}

	/** Check if table supports foreign keys
	* @param TableStatus $table_status
	*/
	function fk_support(array $table_status) {
		return preg_match('~InnoDB|IBMDB2I' . (min_version(5.6) ? '|NDB' : '') . '~i', $table_status["Engine"]);
	}

	/** Get information about fields
	* @return Field[]
	*/
	function fields($table) {
		$maria = (connection()->flavor == 'maria');
		$return = array();
		foreach (get_rows("SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = " . q($table) . " ORDER BY ORDINAL_POSITION") as $row) {
			$field = $row["COLUMN_NAME"];
			$type = $row["COLUMN_TYPE"];
			$generation = $row["GENERATION_EXPRESSION"];
			$extra = $row["EXTRA"];
			// https://mariadb.com/kb/en/library/show-columns/, https://github.com/vrana/adminer/pull/359#pullrequestreview-276677186
			preg_match('~^(VIRTUAL|PERSISTENT|STORED)~', $extra, $generated);
			preg_match('~^([^( ]+)(?:\((.+)\))?( unsigned)?( zerofill)?$~', $type, $match_type);
			$default = $row["COLUMN_DEFAULT"];
			if ($default != "") {
				$is_text = preg_match('~text|json~', $match_type[1]);
				if (!$maria && $is_text) {
					// default value a'b of text column is stored as _utf8mb4\'a\\\'b\' in MySQL
					$default = preg_replace("~^(_\w+)?('.*')$~", '\2', stripslashes($default));
				}
				if ($maria || $is_text) {
					$default = ($default == "NULL" ? null : preg_replace_callback("~^'(.*)'$~", function ($match) {
						return stripslashes(str_replace("''", "'", $match[1]));
					}, $default));
				}
				if (!$maria && preg_match('~binary~', $match_type[1]) && preg_match('~^0x(\w*)$~', $default, $match)) {
					$default = pack("H*", $match[1]);
				}
			}
			$return[$field] = array(
				"field" => $field,
				"full_type" => $type,
				"type" => $match_type[1],
				"length" => $match_type[2],
				"unsigned" => ltrim($match_type[3] . $match_type[4]),
				"default" => ($generated
					? ($maria ? $generation : stripslashes($generation))
					: $default
				),
				"null" => ($row["IS_NULLABLE"] == "YES"),
				"auto_increment" => ($extra == "auto_increment"),
				"on_update" => (preg_match('~\bon update (\w+)~i', $extra, $match) ? $match[1] : ""), //! available since MySQL 5.1.23
				"collation" => $row["COLLATION_NAME"],
				"privileges" => array_flip(explode(",", "$row[PRIVILEGES],where,order")),
				"comment" => $row["COLUMN_COMMENT"],
				"primary" => ($row["COLUMN_KEY"] == "PRI"),
				"generated" => ($generated[1] == "PERSISTENT" ? "STORED" : $generated[1]),
			);
		}
		return $return;
	}

	/** Get table indexes
	* @return Index[]
	*/
	function indexes($table, $connection2 = null) {
		$return = array();
		foreach (get_rows("SHOW INDEX FROM " . table($table), $connection2) as $row) {
			$name = $row["Key_name"];
			$return[$name]["type"] = ($name == "PRIMARY" ? "PRIMARY" : ($row["Index_type"] == "FULLTEXT" ? "FULLTEXT" : ($row["Non_unique"] ? ($row["Index_type"] == "SPATIAL" ? "SPATIAL" : "INDEX") : "UNIQUE")));
			$return[$name]["columns"][] = $row["Column_name"];
			$return[$name]["lengths"][] = ($row["Index_type"] == "SPATIAL" ? null : $row["Sub_part"]);
			$return[$name]["descs"][] = null;
			$return[$name]["algorithm"] = $row["Index_type"];
		}
		return $return;
	}

	/** Get foreign keys in table
	* @return ForeignKey[]
	*/
	function foreign_keys($table) {
		static $pattern = '(?:`(?:[^`]|``)+`|"(?:[^"]|"")+")';
		$return = array();
		$create_table = get_val("SHOW CREATE TABLE " . table($table), 1);
		if ($create_table) {
			preg_match_all(
				"~CONSTRAINT ($pattern) FOREIGN KEY ?\\(((?:$pattern,? ?)+)\\) REFERENCES ($pattern)(?:\\.($pattern))? \\(((?:$pattern,? ?)+)\\)(?: ON DELETE (" . driver()->onActions . "))?(?: ON UPDATE (" . driver()->onActions . "))?~",
				$create_table,
				$matches,
				PREG_SET_ORDER
			);
			foreach ($matches as $match) {
				preg_match_all("~$pattern~", $match[2], $source);
				preg_match_all("~$pattern~", $match[5], $target);
				$return[idf_unescape($match[1])] = array(
					"db" => idf_unescape($match[4] != "" ? $match[3] : $match[4]),
					"table" => idf_unescape($match[4] != "" ? $match[4] : $match[3]),
					"source" => array_map('Adminer\idf_unescape', $source[0]),
					"target" => array_map('Adminer\idf_unescape', $target[0]),
					"on_delete" => ($match[6] ?: "RESTRICT"),
					"on_update" => ($match[7] ?: "RESTRICT"),
				);
			}
		}
		return $return;
	}

	/** Get view SELECT
	* @return array{select:string}
	*/
	function view($name) {
		return array("select" => preg_replace('~^(?:[^`]|`[^`]*`)*\s+AS\s+~isU', '', get_val("SHOW CREATE VIEW " . table($name), 1)));
	}

	/** Get sorted grouped list of collations
	* @return string[][]
	*/
	function collations() {
		$return = array();
		foreach (get_rows("SHOW COLLATION") as $row) {
			if ($row["Default"]) {
				$return[$row["Charset"]][-1] = $row["Collation"];
			} else {
				$return[$row["Charset"]][] = $row["Collation"];
			}
		}
		ksort($return);
		foreach ($return as $key => $val) {
			sort($return[$key]);
		}
		return $return;
	}

	/** Find out if database is information_schema */
	function information_schema($db) {
		return ($db == "information_schema")
			|| (min_version(5.5) && $db == "performance_schema");
	}

	/** Get escaped error message */
	function error() {
		return h(preg_replace('~^You have an error.*syntax to use~U', "Syntax error", connection()->error));
	}

	/** Create database
	* @return Result
	*/
	function create_database($db, $collation) {
		return queries("CREATE DATABASE " . idf_escape($db) . ($collation ? " COLLATE " . q($collation) : ""));
	}

	/** Drop databases
	* @param list<string> $databases
	*/
	function drop_databases(array $databases) {
		$return = apply_queries("DROP DATABASE", $databases, 'Adminer\idf_escape');
		restart_session();
		set_session("dbs", null);
		return $return;
	}

	/** Rename database from DB
	* @param string $name new name
	*/
	function rename_database($name, $collation) {
		$return = false;
		if (create_database($name, $collation)) {
			$tables = array();
			$views = array();
			foreach (tables_list() as $table => $type) {
				if ($type == 'VIEW') {
					$views[] = $table;
				} else {
					$tables[] = $table;
				}
			}
			$return = (!$tables && !$views) || move_tables($tables, $views, $name);
			drop_databases($return ? array(DB) : array());
		}
		return $return;
	}

	/** Generate modifier for auto increment column */
	function auto_increment() {
		$auto_increment_index = " PRIMARY KEY";
		// don't overwrite primary key by auto_increment
		if ($_GET["create"] != "" && $_POST["auto_increment_col"]) {
			foreach (indexes($_GET["create"]) as $index) {
				if (in_array($_POST["fields"][$_POST["auto_increment_col"]]["orig"], $index["columns"], true)) {
					$auto_increment_index = "";
					break;
				}
				if ($index["type"] == "PRIMARY") {
					$auto_increment_index = " UNIQUE";
				}
			}
		}
		return " AUTO_INCREMENT$auto_increment_index";
	}

	/** Run commands to create or alter table
	* @param string $table "" to create
	* @param string $name new name
	* @param list<array{string, list<string>, string}> $fields of [$orig, $process_field, $after]
	* @param string[] $foreign
	* @param numeric-string|'' $auto_increment
	* @param ?Partitions $partitioning null means remove partitioning
	* @return Result|bool
	*/
	function alter_table($table, $name, array $fields, array $foreign, $comment, $engine, $collation, $auto_increment, $partitioning) {
		$alter = array();
		foreach ($fields as $field) {
			if ($field[1]) {
				$default = $field[1][3];
				if (preg_match('~ GENERATED~', $default)) {
					// swap default and null
					$field[1][3] = (connection()->flavor == 'maria' ? "" : $field[1][2]); // MariaDB doesn't support NULL on virtual columns
					$field[1][2] = $default;
				}
				$alter[] = ($table != "" ? ($field[0] != "" ? "CHANGE " . idf_escape($field[0]) : "ADD") : " ") . " " . implode($field[1]) . ($table != "" ? $field[2] : "");
			} else {
				$alter[] = "DROP " . idf_escape($field[0]);
			}
		}
		$alter = array_merge($alter, $foreign);
		$status = ($comment !== null ? " COMMENT=" . q($comment) : "")
			. ($engine ? " ENGINE=" . q($engine) : "")
			. ($collation ? " COLLATE " . q($collation) : "")
			. ($auto_increment != "" ? " AUTO_INCREMENT=$auto_increment" : "")
		;

		if ($partitioning) {
			$partitions = array();
			if ($partitioning["partition_by"] == 'RANGE' || $partitioning["partition_by"] == 'LIST') {
				foreach ($partitioning["partition_names"] as $key => $val) {
					$value = $partitioning["partition_values"][$key];
					$partitions[] = "\n  PARTITION " . idf_escape($val) . " VALUES " . ($partitioning["partition_by"] == 'RANGE' ? "LESS THAN" : "IN") . ($value != "" ? " ($value)" : " MAXVALUE"); //! SQL injection
				}
			}
			// $partitioning["partition"] can be expression, not only column
			$status .= "\nPARTITION BY $partitioning[partition_by]($partitioning[partition])";
			if ($partitions) {
				$status .= " (" . implode(",", $partitions) . "\n)";
			} elseif ($partitioning["partitions"]) {
				$status .= " PARTITIONS " . (+$partitioning["partitions"]);
			}
		} elseif ($partitioning === null) {
			$status .= "\nREMOVE PARTITIONING";
		}

		if ($table == "") {
			return queries("CREATE TABLE " . table($name) . " (\n" . implode(",\n", $alter) . "\n)$status");
		}
		if ($table != $name) {
			$alter[] = "RENAME TO " . table($name);
		}
		if ($status) {
			$alter[] = ltrim($status);
		}
		return ($alter ? queries("ALTER TABLE " . table($table) . "\n" . implode(",\n", $alter)) : true);
	}

	/** Run commands to alter indexes
	* @param string $table escaped table name
	* @param list<array{string, string, 'DROP'|list<string>, 3?: string, 4?: string}> $alter of ["index type", "name", ["column definition", ...], "algorithm", "condition"] or ["index type", "name", "DROP"]
	* @return Result|bool
	*/
	function alter_indexes($table, $alter) {
		$changes = array();
		foreach ($alter as $val) {
			$changes[] = ($val[2] == "DROP"
				? "\nDROP INDEX " . idf_escape($val[1])
				: "\nADD $val[0] " . ($val[0] == "PRIMARY" ? "KEY " : "") . ($val[1] != "" ? idf_escape($val[1]) . " " : "") . "(" . implode(", ", $val[2]) . ")"
			);
		}
		return queries("ALTER TABLE " . table($table) . implode(",", $changes));
	}

	/** Run commands to truncate tables
	* @param list<string> $tables
	*/
	function truncate_tables(array $tables) {
		return apply_queries("TRUNCATE TABLE", $tables);
	}

	/** Drop views
	* @param list<string> $views
	* @return Result|bool
	*/
	function drop_views(array $views) {
		return queries("DROP VIEW " . implode(", ", array_map('Adminer\table', $views)));
	}

	/** Drop tables
	* @param list<string> $tables
	* @return Result|bool
	*/
	function drop_tables(array $tables) {
		return queries("DROP TABLE " . implode(", ", array_map('Adminer\table', $tables)));
	}

	/** Move tables to other schema
	* @param list<string> $tables
	* @param list<string> $views
	*/
	function move_tables(array $tables, array $views, $target) {
		$rename = array();
		foreach ($tables as $table) {
			$rename[] = table($table) . " TO " . idf_escape($target) . "." . table($table);
		}
		if (!$rename || queries("RENAME TABLE " . implode(", ", $rename))) {
			$definitions = array();
			foreach ($views as $table) {
				$definitions[table($table)] = view($table);
			}
			connection()->select_db($target);
			$db = idf_escape(DB);
			foreach ($definitions as $name => $view) {
				if (!queries("CREATE VIEW $name AS " . str_replace(" $db.", " ", $view["select"])) || !queries("DROP VIEW $db.$name")) {
					return false;
				}
			}
			return true;
		}
		//! move triggers
		return false;
	}

	/** Copy tables to other schema
	* @param list<string> $tables
	* @param list<string> $views
	*/
	function copy_tables(array $tables, array $views, $target) {
		queries("SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO'");
		foreach ($tables as $table) {
			$name = ($target == DB ? table("copy_$table") : idf_escape($target) . "." . table($table));
			if (
				($_POST["overwrite"] && !queries("\nDROP TABLE IF EXISTS $name"))
				|| !queries("CREATE TABLE $name LIKE " . table($table))
				|| !queries("INSERT INTO $name SELECT * FROM " . table($table))
			) {
				return false;
			}
			foreach (get_rows("SHOW TRIGGERS LIKE " . q(addcslashes($table, "%_\\"))) as $row) {
				$trigger = $row["Trigger"];
				if (!queries("CREATE TRIGGER " . ($target == DB ? idf_escape("copy_$trigger") : idf_escape($target) . "." . idf_escape($trigger)) . " $row[Timing] $row[Event] ON $name FOR EACH ROW\n$row[Statement];")) {
					return false;
				}
			}
		}
		foreach ($views as $table) {
			$name = ($target == DB ? table("copy_$table") : idf_escape($target) . "." . table($table));
			$view = view($table);
			if (
				($_POST["overwrite"] && !queries("DROP VIEW IF EXISTS $name"))
				|| !queries("CREATE VIEW $name AS $view[select]") //! USE to avoid db.table
			) {
				return false;
			}
		}
		return true;
	}

	/** Get information about trigger
	* @param string $name trigger name
	* @return Trigger
	*/
	function trigger($name, $table) {
		if ($name == "") {
			return array();
		}
		$rows = get_rows("SHOW TRIGGERS WHERE `Trigger` = " . q($name));
		return reset($rows);
	}

	/** Get defined triggers
	* @return array{string, string}[]
	*/
	function triggers($table) {
		$return = array();
		foreach (get_rows("SHOW TRIGGERS LIKE " . q(addcslashes($table, "%_\\"))) as $row) {
			$return[$row["Trigger"]] = array($row["Timing"], $row["Event"]);
		}
		return $return;
	}

	/** Get trigger options
	* @return array{Timing: list<string>, Event: list<string>, Type: list<string>}
	*/
	function trigger_options() {
		return array(
			"Timing" => array("BEFORE", "AFTER"),
			"Event" => array("INSERT", "UPDATE", "DELETE"),
			"Type" => array("FOR EACH ROW"),
		);
	}

	/** Get information about stored routine
	* @param 'FUNCTION'|'PROCEDURE' $type
	* @return Routine
	*/
	function routine($name, $type) {
		$fields = get_rows("SELECT
	PARAMETER_NAME field,
	DATA_TYPE type,
	CHARACTER_MAXIMUM_LENGTH length,
	REGEXP_REPLACE(DTD_IDENTIFIER, '^[^ ]+ ', '') `unsigned`,
	1 `null`,
	DTD_IDENTIFIER full_type,
	PARAMETER_MODE `inout`,
	CHARACTER_SET_NAME collation
FROM information_schema.PARAMETERS
WHERE SPECIFIC_SCHEMA = DATABASE() AND ROUTINE_TYPE = '$type' AND SPECIFIC_NAME = " . q($name) . "
ORDER BY ORDINAL_POSITION");
		$return = connection()->query("SELECT ROUTINE_COMMENT comment, ROUTINE_DEFINITION definition, 'SQL' language
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_TYPE = '$type' AND ROUTINE_NAME = " . q($name))->fetch_assoc();
		if ($fields && $fields[0]['field'] == '') {
			$return['returns'] = array_shift($fields);
		}
		$return['fields'] = $fields;
		/** @phpstan-var Routine */
		return $return;
	}

	/** Get list of routines
	* @return list<string[]> ["SPECIFIC_NAME" => , "ROUTINE_NAME" => , "ROUTINE_TYPE" => , "DTD_IDENTIFIER" => ]
	*/
	function routines() {
		return get_rows("SELECT SPECIFIC_NAME, ROUTINE_NAME, ROUTINE_TYPE, DTD_IDENTIFIER FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE()");
	}

	/** Get list of available routine languages
	* @return list<string>
	*/
	function routine_languages() {
		return array(); // "SQL" not required
	}

	/** Get routine signature
	* @param Routine $row
	*/
	function routine_id($name, array $row) {
		return idf_escape($name);
	}

	/** Get last auto increment ID
	* @param Result|bool $result
	*/
	function last_id($result) {
		return get_val("SELECT LAST_INSERT_ID()"); // mysql_insert_id() truncates bigint
	}

	/** Explain select
	* @return Result
	*/
	function explain(Db $connection, $query) {
		return $connection->query("EXPLAIN " . (min_version(5.1) && !min_version(5.7) ? "PARTITIONS " : "") . $query);
	}

	/** Get approximate number of rows
	* @param TableStatus $table_status
	* @param list<string> $where
	* @return numeric-string|null null if approximate number can't be retrieved
	*/
	function found_rows(array $table_status, array $where) {
		return ($where || $table_status["Engine"] != "InnoDB" ? null : $table_status["Rows"]);
	}

	/** Get SQL command to create table */
	function create_sql($table, $auto_increment, $style) {
		$return = get_val("SHOW CREATE TABLE " . table($table), 1);
		if (!$auto_increment) {
			$return = preg_replace('~ AUTO_INCREMENT=\d+~', '', $return); //! skip comments
		}
		return $return;
	}

	/** Get SQL command to truncate table */
	function truncate_sql($table) {
		return "TRUNCATE " . table($table);
	}

	/** Get SQL command to change database */
	function use_sql($database, $style = "") {
		$name = idf_escape($database);
		$return = "";
		if (preg_match('~CREATE~', $style) && ($create = get_val("SHOW CREATE DATABASE $name", 1))) {
			set_utf8mb4($create);
			if ($style == "DROP+CREATE") {
				$return = "DROP DATABASE IF EXISTS $name;\n";
			}
			$return .= "$create;\n";
		}
		return $return . "USE $name";
	}

	/** Get SQL commands to create triggers */
	function trigger_sql($table) {
		$return = "";
		foreach (get_rows("SHOW TRIGGERS LIKE " . q(addcslashes($table, "%_\\")), null, "-- ") as $row) {
			$return .= "\nCREATE TRIGGER " . idf_escape($row["Trigger"]) . " $row[Timing] $row[Event] ON " . table($row["Table"]) . " FOR EACH ROW\n$row[Statement];;\n";
		}
		return $return;
	}

	/** Get server variables
	* @return list<string[]> [[$name, $value]]
	*/
	function show_variables() {
		return get_rows("SHOW VARIABLES");
	}

	/** Get status variables
	* @return list<string[]> [[$name, $value]]
	*/
	function show_status() {
		return get_rows("SHOW STATUS");
	}

	/** Get process list
	* @return list<string[]> [$row]
	*/
	function process_list() {
		return get_rows("SHOW FULL PROCESSLIST");
	}

	/** Convert field in select and edit
	* @param Field $field
	* @return string|void
	*/
	function convert_field(array $field) {
		if (preg_match("~binary~", $field["type"])) {
			return "HEX(" . idf_escape($field["field"]) . ")";
		}
		if ($field["type"] == "bit") {
			return "BIN(" . idf_escape($field["field"]) . " + 0)"; // + 0 is required outside MySQLnd
		}
		if (preg_match("~geometry|point|linestring|polygon~", $field["type"])) {
			return (min_version(8) ? "ST_" : "") . "AsWKT(" . idf_escape($field["field"]) . ")";
		}
	}

	/** Convert value in edit after applying functions back
	* @param Field $field
	* @param string $return SQL expression
	*/
	function unconvert_field(array $field, $return) {
		if (preg_match("~binary~", $field["type"])) {
			$return = "UNHEX($return)";
		}
		if ($field["type"] == "bit") {
			$return = "CONVERT(b$return, UNSIGNED)";
		}
		if (preg_match("~geometry|point|linestring|polygon~", $field["type"])) {
			$prefix = (min_version(8) ? "ST_" : "");
			$return = $prefix . "GeomFromText($return, $prefix" . "SRID($field[field]))";
		}
		return $return;
	}

	/** Check whether a feature is supported
	* @param literal-string $feature check|comment|columns|copy|database|descidx|drop_col|dump|event|indexes|kill|materializedview
	* |move_col|privileges|procedure|processlist|routine|scheme|sequence|sql|status|table|trigger|type|variables|view|view_trigger
	*/
	function support($feature) {
		return preg_match(
			'~^(comment|columns|copy|database|drop_col|dump|indexes|kill|privileges|move_col|procedure|processlist|routine|sql|status|table|trigger|variables|view'
				. (min_version(5.1) ? '|event' : '')
				. (min_version(8) ? '|descidx' : '')
				. (min_version('8.0.16', '10.2.1') ? '|check' : '')
				. ')$~',
			$feature
		);
	}

	/** Kill a process
	* @param numeric-string $id
	* @return Result|bool
	*/
	function kill_process($id) {
		return queries("KILL " . number($id));
	}

	/** Return query to get connection ID */
	function connection_id() {
		return "SELECT CONNECTION_ID()";
	}

	/** Get maximum number of connections
	* @return numeric-string
	*/
	function max_connections() {
		return get_val("SELECT @@max_connections");
	}

	// Not used is MySQL but checked in compile.php:

	/** Get user defined types
	* @return string[] [$id => $name]
	*/
	function types() {
		return array();
	}

	/** Get values of user defined type */
	function type_values($id) {
		return "";
	}

	/** Get existing schemas
	* @return list<string>
	*/
	function schemas() {
		return array();
	}

	/** Get current schema */
	function get_schema() {
		return "";
	}

	/** Set current schema
	*/
	function set_schema($schema, $connection2 = null) {
		return true;
	}
}
 // must be included as last driver

define('Adminer\JUSH', Driver::$jush);
define('Adminer\SERVER', "" . $_GET[DRIVER]); // read from pgsql=localhost, '' means default server
define('Adminer\DB', "$_GET[db]"); // for the sake of speed and size
define(
	'Adminer\ME',
	preg_replace('~\?.*~', '', relative_uri()) . '?'
		. (sid() ? SID . '&' : '')
		. (SERVER !== null ? DRIVER . "=" . urlencode(SERVER) . '&' : '')
		. ($_GET["ext"] ? "ext=" . urlencode($_GET["ext"]) . '&' : '')
		. (isset($_GET["username"]) ? "username=" . urlencode($_GET["username"]) . '&' : '')
		. (DB != "" ? 'db=' . urlencode(DB) . '&' . (isset($_GET["ns"]) ? "ns=" . urlencode($_GET["ns"]) . "&" : "") : '')
);

/** Print HTML header
* @param string $title used in title, breadcrumb and heading, should be HTML escaped
* @param mixed $breadcrumb ["key" => "link", "key2" => ["link", "desc"]], null for nothing, false for driver only, true for driver and server
* @param string $title2 used after colon in title and heading, should be HTML escaped
*/
function page_header($title, $error = "", $breadcrumb = array(), $title2 = "") {
	page_headers();
	if (is_ajax() && $error) {
		page_messages($error);
		exit;
	}
	if (!ob_get_level()) {
		ob_start('ob_gzhandler', 4096);
	}
	$title_all = $title . ($title2 != "" ? ": $title2" : "");
	$title_page = strip_tags($title_all . (SERVER != "" && SERVER != "localhost" ? h(" - " . SERVER) : "") . " - " . adminer()->name());
	// initial-scale=1 is the default but Chrome 134 on iOS is not able to zoom out without it
	?>
<!DOCTYPE html>
<html lang="<?php echo LANG; ?>" dir="<?php echo lang(81); ?>">
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title><?php echo $title_page; ?></title>
<link rel="stylesheet" href="<?php echo h(preg_replace("~\\?.*~", "", ME) . "?file=default.css&version=5.4.2"); ?>">
<?php

	$css = adminer()->css();
	if (is_int(key($css))) { // legacy return value
		$css = array_fill_keys($css, 'light');
	}
	$has_light = in_array('light', $css) || in_array('', $css);
	$has_dark = in_array('dark', $css) || in_array('', $css);
	$dark = ($has_light
		? ($has_dark ? null : false) // both styles - autoswitching, only adminer.css - light
		: ($has_dark ?: null) // only adminer-dark.css - dark, neither - autoswitching
	);
	$media = " media='(prefers-color-scheme: dark)'";
	if ($dark !== false) {
		echo "<link rel='stylesheet'" . ($dark ? "" : $media) . " href='" . h(preg_replace("~\\?.*~", "", ME) . "?file=dark.css&version=5.4.2") . "'>\n";
	}
	echo "<meta name='color-scheme' content='" . ($dark === null ? "light dark" : ($dark ? "dark" : "light")) . "'>\n";

	// this is matched by compile.php
	echo script_src(preg_replace("~\\?.*~", "", ME) . "?file=functions.js&version=5.4.2");
		if (adminer()->head($dark)) {
		echo "<link rel='icon' href='data:image/gif;base64,R0lGODlhEAAQAJEAAAQCBPz+/PwCBAROZCH5BAEAAAAALAAAAAAQABAAAAI2hI+pGO1rmghihiUdvUBnZ3XBQA7f05mOak1RWXrNq5nQWHMKvuoJ37BhVEEfYxQzHjWQ5qIAADs='>\n";
		echo "<link rel='apple-touch-icon' href='" . h(preg_replace("~\\?.*~", "", ME) . "?file=logo.png&version=5.4.2") . "'>\n";
	}
	foreach ($css as $url => $mode) {
		$attrs = ($mode == 'dark' && !$dark
			? $media
			: ($mode == 'light' && $has_dark ? " media='(prefers-color-scheme: light)'" : "")
		);
		echo "<link rel='stylesheet'$attrs href='" . h($url) . "'>\n";
	}
	echo "\n<body class='" . lang(81) . " nojs";
	adminer()->bodyClass();
	echo "'>\n";
	$filename = get_temp_dir() . "/adminer.version";
	echo script("mixin(document.body, {onkeydown: bodyKeydown, onclick: bodyClick"
		. (isset($_COOKIE["adminer_version"]) ? "" : ", onload: partial(verifyVersion, '" . VERSION . "')")
		. "});
document.body.classList.replace('nojs', 'js');
const offlineMessage = '" . js_escape(lang(82)) . "';
const thousandsSeparator = '" . js_escape(lang(4)) . "';")
	;
	echo "<div id='help' class='jush-" . JUSH . " jsonly hidden'></div>\n";
	echo script("mixin(qs('#help'), {onmouseover: () => { helpOpen = 1; }, onmouseout: helpMouseout});");
	echo "<div id='content'>\n";
	echo "<span id='menuopen' class='jsonly'>" . icon("move", "", "menu", "") . "</span>" . script("qs('#menuopen').onclick = event => { qs('#foot').classList.toggle('foot'); event.stopPropagation(); }");
	if ($breadcrumb !== null) {
		$link = substr(preg_replace('~\b(username|db|ns)=[^&]*&~', '', ME), 0, -1);
		echo '<p id="breadcrumb"><a href="' . h($link ?: ".") . '">' . get_driver(DRIVER) . '</a> » ';
		$link = substr(preg_replace('~\b(db|ns)=[^&]*&~', '', ME), 0, -1);
		$server = adminer()->serverName(SERVER);
		$server = ($server != "" ? $server : lang(25));
		if ($breadcrumb === false) {
			echo "$server\n";
		} else {
			echo "<a href='" . h($link) . "' accesskey='1' title='Alt+Shift+1'>$server</a> » ";
			if ($_GET["ns"] != "" || (DB != "" && is_array($breadcrumb))) {
				echo '<a href="' . h($link . "&db=" . urlencode(DB) . (support("scheme") ? "&ns=" : "")) . '">' . h(DB) . '</a> » ';
			}
			if (is_array($breadcrumb)) {
				if ($_GET["ns"] != "") {
					echo '<a href="' . h(substr(ME, 0, -1)) . '">' . h($_GET["ns"]) . '</a> » ';
				}
				foreach ($breadcrumb as $key => $val) {
					$desc = (is_array($val) ? $val[1] : h($val));
					if ($desc != "") {
						echo "<a href='" . h(ME . "$key=") . urlencode(is_array($val) ? $val[0] : $val) . "'>$desc</a> » ";
					}
				}
			}
			echo "$title\n";
		}
	}
	echo "<h2>$title_all</h2>\n";
	echo "<div id='ajaxstatus' class='jsonly hidden'></div>\n";
	restart_session();
	page_messages($error);
	$databases = &get_session("dbs");
	if (DB != "" && $databases && !in_array(DB, $databases, true)) {
		$databases = null;
	}
	stop_session();
	define('Adminer\PAGE_HEADER', 1);
}

/** Send HTTP headers */
function page_headers() {
	header("Content-Type: text/html; charset=utf-8");
	header("Cache-Control: no-cache");
	header("X-Frame-Options: deny"); // ClickJacking protection in IE8, Safari 4, Chrome 2, Firefox 3.6.9
	header("X-XSS-Protection: 0"); // prevents introducing XSS in IE8 by removing safe parts of the page
	header("X-Content-Type-Options: nosniff");
	header("Referrer-Policy: origin-when-cross-origin");
	foreach (adminer()->csp(csp()) as $csp) {
		$header = array();
		foreach ($csp as $key => $val) {
			$header[] = "$key $val";
		}
		header("Content-Security-Policy: " . implode("; ", $header));
	}
	adminer()->headers();
}

/** Get Content Security Policy headers
* @return list<string[]> of arrays with directive name in key, allowed sources in value
*/
function csp() {
	return array(
		array(
			"script-src" => "'self' 'unsafe-inline' 'nonce-" . get_nonce() . "' 'strict-dynamic'", // 'self' is a fallback for browsers not supporting 'strict-dynamic', 'unsafe-inline' is a fallback for browsers not supporting 'nonce-'
			"connect-src" => "'self' https://www.adminer.org",
			"frame-src" => "'none'",
			"object-src" => "'none'",
			"base-uri" => "'none'",
			"form-action" => "'self'",
		),
	);
}

/** Get a CSP nonce
* @return string Base64 value
*/
function get_nonce() {
	static $nonce;
	if (!$nonce) {
		$nonce = base64_encode(rand_string());
	}
	return $nonce;
}

/** Print flash and error messages */
function page_messages($error) {
	$uri = preg_replace('~^[^?]*~', '', $_SERVER["REQUEST_URI"]);
	$messages = idx($_SESSION["messages"], $uri);
	if ($messages) {
		echo "<div class='message'>" . implode("</div>\n<div class='message'>", $messages) . "</div>" . script("messagesPrint();");
		unset($_SESSION["messages"][$uri]);
	}
	if ($error) {
		echo "<div class='error'>$error</div>\n";
	}
	if (adminer()->error) { // separate <div>
		echo "<div class='error'>" . adminer()->error . "</div>\n";
	}
}

/** Print HTML footer
* @param ''|'auth'|'db'|'ns' $missing
*/
function page_footer($missing = "") {
	echo "</div>\n\n<div id='foot' class='foot'>\n<div id='menu'>\n";
	adminer()->navigation($missing);
	echo "</div>\n";
	if ($missing != "auth") {
		?>
<form action="" method="post">
<p class="logout">
<span><?php echo h($_GET["username"]) . "\n"; ?></span>
<input type="submit" name="logout" value="<?php echo lang(83); ?>" id="logout">
<?php echo input_token(); ?>
</form>
<?php
	}
	echo "</div>\n\n";
	echo script("setupSubmitHighlight(document);");
}

/** PHP implementation of XXTEA encryption algorithm
* @author Ma Bingyao <andot@ujn.edu.cn>
* @link http://www.coolcode.cn/?action=show&id=128
*/

function int32($n) {
	while ($n >= 2147483648) {
		$n -= 4294967296;
	}
	while ($n <= -2147483649) {
		$n += 4294967296;
	}
	return (int) $n;
}

/**
* @param int[] $v
*/
function long2str(array $v, $w) {
	$s = '';
	foreach ($v as $val) {
		$s .= pack('V', $val);
	}
	if ($w) {
		return substr($s, 0, end($v));
	}
	return $s;
}

/**
* @return int[]
*/
function str2long($s, $w) {
	$v = array_values(unpack('V*', str_pad($s, 4 * ceil(strlen($s) / 4), "\0")));
	if ($w) {
		$v[] = strlen($s);
	}
	return $v;
}

function xxtea_mx($z, $y, $sum, $k) {
	return int32((($z >> 5 & 0x7FFFFFF) ^ $y << 2) + (($y >> 3 & 0x1FFFFFFF) ^ $z << 4)) ^ int32(($sum ^ $y) + ($k ^ $z));
}

/** Cipher
* @param string $str plain-text password
* @return string binary cipher
*/
function encrypt_string($str, $key) {
	if ($str == "") {
		return "";
	}
	$key = array_values(unpack("V*", pack("H*", md5($key))));
	$v = str2long($str, true);
	$n = count($v) - 1;
	$z = $v[$n];
	$y = $v[0];
	$q = floor(6 + 52 / ($n + 1));
	$sum = 0;
	while ($q-- > 0) {
		$sum = int32($sum + 0x9E3779B9);
		$e = $sum >> 2 & 3;
		for ($p=0; $p < $n; $p++) {
			$y = $v[$p + 1];
			$mx = xxtea_mx($z, $y, $sum, $key[$p & 3 ^ $e]);
			$z = int32($v[$p] + $mx);
			$v[$p] = $z;
		}
		$y = $v[0];
		$mx = xxtea_mx($z, $y, $sum, $key[$p & 3 ^ $e]);
		$z = int32($v[$n] + $mx);
		$v[$n] = $z;
	}
	return long2str($v, false);
}

/** Decipher
* @param string $str binary cipher
* @return string|false plain-text password
*/
function decrypt_string($str, $key) {
	if ($str == "") {
		return "";
	}
	if (!$key) {
		return false;
	}
	$key = array_values(unpack("V*", pack("H*", md5($key))));
	$v = str2long($str, false);
	$n = count($v) - 1;
	$z = $v[$n];
	$y = $v[0];
	$q = floor(6 + 52 / ($n + 1));
	$sum = int32($q * 0x9E3779B9);
	while ($sum) {
		$e = $sum >> 2 & 3;
		for ($p=$n; $p > 0; $p--) {
			$z = $v[$p - 1];
			$mx = xxtea_mx($z, $y, $sum, $key[$p & 3 ^ $e]);
			$y = int32($v[$p] - $mx);
			$v[$p] = $y;
		}
		$z = $v[$n];
		$mx = xxtea_mx($z, $y, $sum, $key[$p & 3 ^ $e]);
		$y = int32($v[0] - $mx);
		$v[0] = $y;
		$sum = int32($sum - 0x9E3779B9);
	}
	return long2str($v, true);
}

$permanent = array();
if ($_COOKIE["adminer_permanent"]) {
	foreach (explode(" ", $_COOKIE["adminer_permanent"]) as $val) {
		list($key) = explode(":", $val);
		$permanent[$key] = $val;
	}
}

function add_invalid_login() {
	$base = get_temp_dir() . "/adminer.invalid";
	// adminer.invalid may not be writable by us, try the files with random suffixes
	foreach (glob("$base*") ?: array($base) as $filename) {
		$fp = file_open_lock($filename);
		if ($fp) {
			break;
		}
	}
	if (!$fp) {
		$fp = file_open_lock("$base-" . rand_string());
	}
	if (!$fp) {
		return;
	}
	$invalids = unserialize(stream_get_contents($fp));
	$time = time();
	if ($invalids) {
		foreach ($invalids as $ip => $val) {
			if ($val[0] < $time) {
				unset($invalids[$ip]);
			}
		}
	}
	$invalid = &$invalids[adminer()->bruteForceKey()];
	if (!$invalid) {
		$invalid = array($time + 30*60, 0); // active for 30 minutes
	}
	$invalid[1]++;
	file_write_unlock($fp, serialize($invalids));
}

/** @param string[] $permanent */
function check_invalid_login(array &$permanent) {
	$invalids = array();
	foreach (glob(get_temp_dir() . "/adminer.invalid*") as $filename) {
		$fp = file_open_lock($filename);
		if ($fp) {
			$invalids = unserialize(stream_get_contents($fp));
			file_unlock($fp);
			break;
		}
	}
	/** @var array{int, int} */
	$invalid = idx($invalids, adminer()->bruteForceKey(), array());
	$next_attempt = ($invalid[1] > 29 ? $invalid[0] - time() : 0); // allow 30 invalid attempts
	if ($next_attempt > 0) { //! do the same with permanent login
		auth_error(lang(84, ceil($next_attempt / 60)), $permanent);
	}
}

$auth = $_POST["auth"];
if ($auth) {
	session_regenerate_id(); // defense against session fixation
	$vendor = $auth["driver"];
	$server = $auth["server"];
	$username = $auth["username"];
	$password = (string) $auth["password"];
	$db = $auth["db"];
	set_password($vendor, $server, $username, $password);
	$_SESSION["db"][$vendor][$server][$username][$db] = true;
	if ($auth["permanent"]) {
		$key = implode("-", array_map('base64_encode', array($vendor, $server, $username, $db)));
		$private = adminer()->permanentLogin(true);
		$permanent[$key] = "$key:" . base64_encode($private ? encrypt_string($password, $private) : "");
		cookie("adminer_permanent", implode(" ", $permanent));
	}
	if (
		count($_POST) == 1 // 1 - auth
		|| DRIVER != $vendor
		|| SERVER != $server
		|| $_GET["username"] !== $username // "0" == "00"
		|| DB != $db
	) {
		redirect(auth_url($vendor, $server, $username, $db));
	}

} elseif ($_POST["logout"] && (!$_SESSION["token"] || verify_token())) {
	foreach (array("pwds", "db", "dbs", "queries") as $key) {
		set_session($key, null);
	}
	unset_permanent($permanent);
	redirect(substr(preg_replace('~\b(username|db|ns)=[^&]*&~', '', ME), 0, -1), lang(85) . ' ' . lang(86));

} elseif ($permanent && !$_SESSION["pwds"]) {
	session_regenerate_id();
	$private = adminer()->permanentLogin();
	foreach ($permanent as $key => $val) {
		list(, $cipher) = explode(":", $val);
		list($vendor, $server, $username, $db) = array_map('base64_decode', explode("-", $key));
		set_password($vendor, $server, $username, decrypt_string(base64_decode($cipher), $private));
		$_SESSION["db"][$vendor][$server][$username][$db] = true;
	}
}

/** Remove credentials from permanent login
* @param string[] $permanent
*/
function unset_permanent(array &$permanent) {
	foreach ($permanent as $key => $val) {
		list($vendor, $server, $username, $db) = array_map('base64_decode', explode("-", $key));
		if ($vendor == DRIVER && $server == SERVER && $username == $_GET["username"] && $db == DB) {
			unset($permanent[$key]);
		}
	}
	cookie("adminer_permanent", implode(" ", $permanent));
}

/** Render an error message and a login form
* @param string $error plain text
* @param string[] $permanent
* @return never
*/
function auth_error($error, array &$permanent) {
	$session_name = session_name();
	if (isset($_GET["username"])) {
		header("HTTP/1.1 403 Forbidden"); // 401 requires sending WWW-Authenticate header
		if (($_COOKIE[$session_name] || $_GET[$session_name]) && !$_SESSION["token"]) {
			$error = lang(87);
		} else {
			restart_session();
			add_invalid_login();
			$password = get_password();
			if ($password !== null) {
				if ($password === false) {
					$error .= ($error ? '<br>' : '') . lang(88, target_blank(), '<code>permanentLogin()</code>');
				}
				set_password(DRIVER, SERVER, $_GET["username"], null);
			}
			unset_permanent($permanent);
		}
	}
	if (!$_COOKIE[$session_name] && $_GET[$session_name] && ini_bool("session.use_only_cookies")) {
		$error = lang(89);
	}
	$params = session_get_cookie_params();
	cookie("adminer_key", ($_COOKIE["adminer_key"] ?: rand_string()), $params["lifetime"]);
	if (!$_SESSION["token"]) {
		$_SESSION["token"] = rand(1, 1e6); // this is for next attempt
	}
	page_header(lang(30), $error, null);
	echo "<form action='' method='post'>\n";
	echo "<div>";
	if (hidden_fields($_POST, array("auth"))) { // expired session
		echo "<p class='message'>" . lang(90) . "\n";
	}
	echo "</div>\n";
	adminer()->loginForm();
	echo "</form>\n";
	page_footer("auth");
	exit;
}

if (isset($_GET["username"]) && !class_exists('Adminer\Db')) {
	unset($_SESSION["pwds"][DRIVER]);
	unset_permanent($permanent);
	page_header(lang(91), lang(92, implode(", ", Driver::$extensions)), false);
	page_footer("auth");
	exit;
}

$connection = '';
if (isset($_GET["username"]) && is_string(get_password())) {
	list(, $port) = host_port(SERVER);
	if (preg_match('~^\s*([-+]?\d+)~', $port, $match) && ($match[1] < 1024 || $match[1] > 65535)) { // is_numeric('80#') would still connect to port 80
		auth_error(lang(93), $permanent);
	}
	check_invalid_login($permanent);
	$credentials = adminer()->credentials();
	$connection = Driver::connect($credentials[0], $credentials[1], $credentials[2]);
	if (is_object($connection)) {
		Db::$instance = $connection;
		Driver::$instance = new Driver($connection);
		if ($connection->flavor) {
			save_settings(array("vendor-" . DRIVER . "-" . SERVER => get_driver(DRIVER)));
		}
	}
}

$login = null;
if (!is_object($connection) || ($login = adminer()->login($_GET["username"], get_password())) !== true) {
	$error = (is_string($connection) ? nl_br(h($connection)) : (is_string($login) ? $login : lang(94)))
		. (preg_match('~^ | $~', get_password()) ? '<br>' . lang(95) : '');
	auth_error($error, $permanent);
}

if ($_POST["logout"] && $_SESSION["token"] && !verify_token()) {
	page_header(lang(83), lang(96));
	page_footer("db");
	exit;
}

if (!$_SESSION["token"]) {
	$_SESSION["token"] = rand(1, 1e6); // defense against cross-site request forgery
}
stop_session(true);
if ($auth && $_POST["token"]) {
	$_POST["token"] = get_token(); // reset token after explicit login
}

$error = ''; ///< @var string
if ($_POST) {
	if (!verify_token()) {
		$ini = "max_input_vars";
		$max_vars = ini_get($ini);
		if (extension_loaded("suhosin")) {
			foreach (array("suhosin.request.max_vars", "suhosin.post.max_vars") as $key) {
				$val = ini_get($key);
				if ($val && (!$max_vars || $val < $max_vars)) {
					$ini = $key;
					$max_vars = $val;
				}
			}
		}
		$error = (!$_POST["token"] && $max_vars
			? lang(97, "'$ini'")
			: lang(96) . ' ' . lang(98)
		);
	}

} elseif ($_SERVER["REQUEST_METHOD"] == "POST") {
	// posted form with no data means that post_max_size exceeded because Adminer always sends token at least
	$error = lang(99, "'post_max_size'");
	if (isset($_GET["sql"])) {
		$error .= ' ' . lang(100);
	}
}

// This file is not used in Adminer Editor.

/** Print select result
* @param Result $result
* @param string[] $orgtables
* @param int|numeric-string $limit
* @return string[] $orgtables
*/
function print_select_result($result, $connection2 = null, array $orgtables = array(), $limit = 0) {
	$links = array(); // colno => orgtable - create links from these columns
	$indexes = array(); // orgtable => array(column => colno) - primary keys
	$columns = array(); // orgtable => array(column => ) - not selected columns in primary key
	$blobs = array(); // colno => bool - display bytes for blobs
	$types = array(); // colno => type - display char in <code>
	$return = array(); // table => orgtable - mapping to use in EXPLAIN
	for ($i=0; (!$limit || $i < $limit) && ($row = $result->fetch_row()); $i++) {
		if (!$i) {
			echo "<div class='scrollable'>\n";
			echo "<table class='nowrap odds'>\n";
			echo "<thead><tr>";
			for ($j=0; $j < count($row); $j++) {
				$field = $result->fetch_field();
				$name = $field->name;
				$orgtable = (isset($field->orgtable) ? $field->orgtable : "");
				$orgname = (isset($field->orgname) ? $field->orgname : $name);
				if ($orgtables && JUSH == "sql") { // MySQL EXPLAIN
					$links[$j] = ($name == "table" ? "table=" : ($name == "possible_keys" ? "indexes=" : null));
				} elseif ($orgtable != "") {
					if (isset($field->table)) {
						$return[$field->table] = $orgtable;
					}
					if (!isset($indexes[$orgtable])) {
						// find primary key in each table
						$indexes[$orgtable] = array();
						foreach (indexes($orgtable, $connection2) as $index) {
							if ($index["type"] == "PRIMARY") {
								$indexes[$orgtable] = array_flip($index["columns"]);
								break;
							}
						}
						$columns[$orgtable] = $indexes[$orgtable];
					}
					if (isset($columns[$orgtable][$orgname])) {
						unset($columns[$orgtable][$orgname]);
						$indexes[$orgtable][$orgname] = $j;
						$links[$j] = $orgtable;
					}
				}
				if ($field->charsetnr == 63) { // 63 - binary
					$blobs[$j] = true;
				}
				$types[$j] = $field->type;
				echo "<th" . ($orgtable != "" || $field->name != $orgname ? " title='" . h(($orgtable != "" ? "$orgtable." : "") . $orgname) . "'" : "") . ">" . h($name)
					. ($orgtables ? doc_link(array(
						'sql' => "explain-output.html#explain_" . strtolower($name),
						'mariadb' => "explain/#the-columns-in-explain-select",
					)) : "")
				;
			}
			echo "</thead>\n";
		}
		echo "<tr>";
		foreach ($row as $key => $val) {
			$link = "";
			if (isset($links[$key]) && !$columns[$links[$key]]) {
				if ($orgtables && JUSH == "sql") { // MySQL EXPLAIN
					$table = $row[array_search("table=", $links)];
					$link = ME . $links[$key] . urlencode($orgtables[$table] != "" ? $orgtables[$table] : $table);
				} else {
					$link = ME . "edit=" . urlencode($links[$key]);
					foreach ($indexes[$links[$key]] as $col => $j) {
						if ($row[$j] === null) {
							$link = "";
							break;
						}
						$link .= "&where" . urlencode("[" . bracket_escape($col) . "]") . "=" . urlencode($row[$j]);
					}
				}
			}
			$field = array(
				'type' => ($blobs[$key] ? 'blob' : ($types[$key] == 254 ? 'char' : '')),
			);
			$val = select_value($val, $link, $field, null);
			// https://dev.mysql.com/doc/dev/mysql-server/latest/field__types_8h.html
			echo "<td" . ($types[$key] <= 9 || $types[$key] == 246 ? " class='number'" : "") . ">$val";
		}
	}
	echo ($i ? "</table>\n</div>" : "<p class='message'>" . lang(14)) . "\n";
	return $return;
}

/** Get referencable tables with single column primary key except self
* @return array<string, Field> [$table_name => $field]
*/
function referencable_primary($self) {
	$return = array(); // table_name => field
	foreach (table_status('', true) as $table_name => $table) {
		if ($table_name != $self && fk_support($table)) {
			foreach (fields($table_name) as $field) {
				if ($field["primary"]) {
					if ($return[$table_name]) { // multi column primary key
						unset($return[$table_name]);
						break;
					}
					$return[$table_name] = $field;
				}
			}
		}
	}
	return $return;
}

/** Print SQL <textarea> tag
* @param string|list<array{string}> $value
*/
function textarea($name, $value, $rows = 10, $cols = 80) {
	echo "<textarea name='" . h($name) . "' rows='$rows' cols='$cols' class='sqlarea jush-" . JUSH . "' spellcheck='false' wrap='off'>";
	if (is_array($value)) {
		foreach ($value as $val) { // not implode() to save memory
			echo h($val[0]) . "\n\n\n"; // $val == array($query, $time, $elapsed)
		}
	} else {
		echo h($value);
	}
	echo "</textarea>";
}

/** Generate HTML <select> or <input> if $options are empty
* @param string[] $options
*/
function select_input($attrs, array $options, $value = "", $onchange = "", $placeholder = "") {
	$tag = ($options ? "select" : "input");
	return "<$tag$attrs" . ($options
		? "><option value=''>$placeholder" . optionlist($options, $value, true) . "</select>"
		: " size='10' value='" . h($value) . "' placeholder='$placeholder'>"
	) . ($onchange ? script("qsl('$tag').onchange = $onchange;", "") : ""); //! use oninput for input
}

/** Print one row in JSON object
* @param string $key or "" to close the object
* @param string|int $val
*/
function json_row($key, $val = null, $escape = true) {
	static $first = true;
	if ($first) {
		echo "{";
	}
	if ($key != "") {
		echo ($first ? "" : ",") . "\n\t\"" . addcslashes($key, "\r\n\t\"\\/") . '": ' . ($val !== null ? ($escape ? '"' . addcslashes($val, "\r\n\"\\/") . '"' : $val) : 'null');
		$first = false;
	} else {
		echo "\n}\n";
		$first = true;
	}
}

/** Print table columns for type edit
* @param Field $field
* @param list<string> $collations
* @param string[] $foreign_keys
* @param list<string> $extra_types extra types to prepend
*/
function edit_type($key, array $field, array $collations, array $foreign_keys = array(), array $extra_types = array()) {
	$type = $field["type"];
	echo "<td><select name='" . h($key) . "[type]' class='type' aria-labelledby='label-type'>";
	if ($type && !array_key_exists($type, driver()->types()) && !isset($foreign_keys[$type]) && !in_array($type, $extra_types)) {
		$extra_types[] = $type;
	}
	$structured_types = driver()->structuredTypes();
	if ($foreign_keys) {
		$structured_types[lang(101)] = $foreign_keys;
	}
	echo optionlist(array_merge($extra_types, $structured_types), $type);
	echo "</select><td>";
	echo "<input name='" . h($key) . "[length]' value='" . h($field["length"]) . "' size='3'"
		. (!$field["length"] && preg_match('~var(char|binary)$~', $type) ? " class='required'" : "") //! type="number" with enabled JavaScript
		. " aria-labelledby='label-length'>";
	echo "<td class='options'>";
	echo ($collations
		? "<input list='collations' name='" . h($key) . "[collation]'" . (preg_match('~(char|text|enum|set)$~', $type) ? "" : " class='hidden'") . " value='" . h($field["collation"]) . "' placeholder='(" . lang(102) . ")'>"
		: ''
	);
	echo (driver()->unsigned ? "<select name='" . h($key) . "[unsigned]'" . (!$type || preg_match(number_type(), $type) ? "" : " class='hidden'") . '><option>' . optionlist(driver()->unsigned, $field["unsigned"]) . '</select>' : '');
	echo (isset($field['on_update']) ? "<select name='" . h($key) . "[on_update]'" . (preg_match('~timestamp|datetime~', $type) ? "" : " class='hidden'") . '>'
		. optionlist(array("" => "(" . lang(103) . ")", "CURRENT_TIMESTAMP"), (preg_match('~^CURRENT_TIMESTAMP~i', $field["on_update"]) ? "CURRENT_TIMESTAMP" : $field["on_update"]))
		. '</select>' : ''
	);
	echo ($foreign_keys
		? "<select name='" . h($key) . "[on_delete]'" . (preg_match("~`~", $type) ? "" : " class='hidden'") . "><option value=''>(" . lang(104) . ")" . optionlist(explode("|", driver()->onActions), $field["on_delete"]) . "</select> "
		: " " // space for IE
	);
}

/** Filter length value including enums */
function process_length($length) {
	$enum_length = driver()->enumLength;
	return (preg_match("~^\\s*\\(?\\s*$enum_length(?:\\s*,\\s*$enum_length)*+\\s*\\)?\\s*\$~", $length) && preg_match_all("~$enum_length~", $length, $matches)
		? "(" . implode(",", $matches[0]) . ")"
		: preg_replace('~^[0-9].*~', '(\0)', preg_replace('~[^-0-9,+()[\]]~', '', $length))
	);
}

/** Create SQL string from field type
* @param FieldType $field
*/
function process_type(array $field, $collate = "COLLATE") {
	return " $field[type]"
		. process_length($field["length"])
		. (preg_match(number_type(), $field["type"]) && in_array($field["unsigned"], driver()->unsigned) ? " $field[unsigned]" : "")
		. (preg_match('~char|text|enum|set~', $field["type"]) && $field["collation"] ? " $collate " . (JUSH == "mssql" ? $field["collation"] : q($field["collation"])) : "")
	;
}

/** Create SQL string from field
* @param Field $field basic field information
* @param Field $type_field information about field type
* @return list<string> ["field", "type", "NULL", "DEFAULT", "ON UPDATE", "COMMENT", "AUTO_INCREMENT"]
*/
function process_field(array $field, array $type_field) {
	// MariaDB exports CURRENT_TIMESTAMP as a function.
	if ($field["on_update"]) {
		$field["on_update"] = str_ireplace("current_timestamp()", "CURRENT_TIMESTAMP", $field["on_update"]);
	}
	return array(
		idf_escape(trim($field["field"])),
		process_type($type_field),
		($field["null"] ? " NULL" : " NOT NULL"), // NULL for timestamp
		default_value($field),
		(preg_match('~timestamp|datetime~', $field["type"]) && $field["on_update"] ? " ON UPDATE $field[on_update]" : ""),
		(support("comment") && $field["comment"] != "" ? " COMMENT " . q($field["comment"]) : ""),
		($field["auto_increment"] ? auto_increment() : null),
	);
}

/** Get default value clause
* @param Field $field
*/
function default_value(array $field) {
	if ($field["default"] === null) {
		return "";
	}
	$default = str_replace("\r", "", $field["default"]);
	$generated = $field["generated"];
	return (in_array($generated, driver()->generated)
		? (JUSH == "mssql" ? " AS ($default)" . ($generated == "VIRTUAL" ? "" : " $generated") : " GENERATED ALWAYS AS ($default) $generated")
		: " DEFAULT " . (!preg_match('~^GENERATED ~i', $default) && (preg_match('~char|binary|text|json|enum|set~', $field["type"]) || preg_match('~^(?![a-z])~i', $default))
			? (JUSH == "sql" && preg_match('~text|json~', $field["type"]) ? "(" . q($default) . ")" : q($default)) // MySQL requires () around default value of text column
			: str_ireplace("current_timestamp()", "CURRENT_TIMESTAMP", (JUSH == "sqlite" ? "($default)" : $default))
		)
	);
}

/** Get type class to use in CSS
* @return string|void class=''
*/
function type_class($type) {
	foreach (
		array(
			'char' => 'text',
			'date' => 'time|year',
			'binary' => 'blob',
			'enum' => 'set',
		) as $key => $val
	) {
		if (preg_match("~$key|$val~", $type)) {
			return " class='$key'";
		}
	}
}

/** Print table interior for fields editing
* @param (Field|RoutineField)[] $fields
* @param list<string> $collations
* @param 'TABLE'|'PROCEDURE' $type
* @param string[] $foreign_keys
*/
function edit_fields(array $fields, array $collations, $type = "TABLE", array $foreign_keys = array()) {
	$fields = array_values($fields);
	$default_class = (($_POST ? $_POST["defaults"] : get_setting("defaults")) ? "" : " class='hidden'");
	$comment_class = (($_POST ? $_POST["comments"] : get_setting("comments")) ? "" : " class='hidden'");
	echo "<thead><tr>\n";
	echo ($type == "PROCEDURE" ? "<td>" : "");
	echo "<th id='label-name'>" . ($type == "TABLE" ? lang(105) : lang(106));
	echo "<td id='label-type'>" . lang(41) . "<textarea id='enum-edit' rows='4' cols='12' wrap='off' style='display: none;'></textarea>" . script("qs('#enum-edit').onblur = editingLengthBlur;");
	echo "<td id='label-length'>" . lang(107);
	echo "<td>" . lang(108); // no label required, options have their own label
	if ($type == "TABLE") {
		echo "<td id='label-null'>NULL\n";
		echo "<td><input type='radio' name='auto_increment_col' value=''><abbr id='label-ai' title='" . lang(43) . "'>AI</abbr>";
		echo doc_link(array(
			'sql' => "example-auto-increment.html",
			'mariadb' => "auto_increment/",
			
			
			
		));
		echo "<td id='label-default'$default_class>" . lang(44);
		echo (support("comment") ? "<td id='label-comment'$comment_class>" . lang(42) : "");
	}
	echo "<td>" . icon("plus", "add[" . (support("move_col") ? 0 : count($fields)) . "]", "+", lang(109));
	echo "</thead>\n<tbody>\n";
	echo script("mixin(qsl('tbody'), {onclick: editingClick, onkeydown: editingKeydown, oninput: editingInput});");
	foreach ($fields as $i => $field) {
		$i++;
		$orig = $field[($_POST ? "orig" : "field")];
		$display = (isset($_POST["add"][$i-1]) || (isset($field["field"]) && !idx($_POST["drop_col"], $i))) && (support("drop_col") || $orig == "");
		echo "<tr" . ($display ? "" : " style='display: none;'") . ">\n";
		echo ($type == "PROCEDURE" ? "<td>" . html_select("fields[$i][inout]", explode("|", driver()->inout), $field["inout"]) : "") . "<th>";
		if ($display) {
			echo "<input name='fields[$i][field]' value='" . h($field["field"]) . "' data-maxlength='64' autocapitalize='off' aria-labelledby='label-name'" . (isset($_POST["add"][$i-1]) ? " autofocus" : "") . ">";
		}
		echo input_hidden("fields[$i][orig]", $orig);
		edit_type("fields[$i]", $field, $collations, $foreign_keys);
		if ($type == "TABLE") {
			echo "<td>" . checkbox("fields[$i][null]", 1, $field["null"], "", "", "block", "label-null");
			echo "<td><label class='block'><input type='radio' name='auto_increment_col' value='$i'" . ($field["auto_increment"] ? " checked" : "") . " aria-labelledby='label-ai'></label>";
			echo "<td$default_class>" . (driver()->generated
				? html_select("fields[$i][generated]", array_merge(array("", "DEFAULT"), driver()->generated), $field["generated"]) . " "
				: checkbox("fields[$i][generated]", 1, $field["generated"], "", "", "", "label-default")
			);
			$attrs = " name='fields[$i][default]' aria-labelledby='label-default'";
			$value = h($field["default"]);
			echo (preg_match('~\n~', $field["default"]) ? "<textarea$attrs rows='2' cols='30' style='vertical-align: bottom;'>\n$value</textarea>" : "<input$attrs value='$value'>"); // \n to preserve the leading newline
			echo (support("comment") ? "<td$comment_class><input name='fields[$i][comment]' value='" . h($field["comment"]) . "' data-maxlength='" . (min_version(5.5) ? 1024 : 255) . "' aria-labelledby='label-comment'>" : "");
		}
		echo "<td>";
		echo (support("move_col") ?
			icon("plus", "add[$i]", "+", lang(109)) . " "
			. icon("up", "up[$i]", "↑", lang(110)) . " "
			. icon("down", "down[$i]", "↓", lang(111)) . " "
		: "");
		echo ($orig == "" || support("drop_col") ? icon("cross", "drop_col[$i]", "x", lang(112)) : "");
	}
}

/** Move fields up and down or add field
* @param Field[] $fields
*/
function process_fields(array &$fields) {
	$offset = 0;
	if ($_POST["up"]) {
		$last = 0;
		foreach ($fields as $key => $field) {
			if (key($_POST["up"]) == $key) {
				unset($fields[$key]);
				array_splice($fields, $last, 0, array($field));
				break;
			}
			if (isset($field["field"])) {
				$last = $offset;
			}
			$offset++;
		}
	} elseif ($_POST["down"]) {
		$found = false;
		foreach ($fields as $key => $field) {
			if (isset($field["field"]) && $found) {
				unset($fields[key($_POST["down"])]);
				array_splice($fields, $offset, 0, array($found));
				break;
			}
			if (key($_POST["down"]) == $key) {
				$found = $field;
			}
			$offset++;
		}
	} elseif ($_POST["add"]) {
		$fields = array_values($fields);
		array_splice($fields, key($_POST["add"]), 0, array(array()));
	} elseif (!$_POST["drop_col"]) {
		return false;
	}
	return true;
}

/** Callback used in routine()
* @param list<string> $match
*/
function normalize_enum(array $match) {
	$val = $match[0];
	return "'" . str_replace("'", "''", addcslashes(stripcslashes(str_replace($val[0] . $val[0], $val[0], substr($val, 1, -1))), '\\')) . "'";
}

/** Issue grant or revoke commands
* @param 'GRANT'|'REVOKE' $grant
* @param list<string> $privileges
* @return Result|bool
*/
function grant($grant, array $privileges, $columns, $on) {
	if (!$privileges) {
		return true;
	}
	if ($privileges == array("ALL PRIVILEGES", "GRANT OPTION")) {
		// can't be granted or revoked together
		return ($grant == "GRANT"
			? queries("$grant ALL PRIVILEGES$on WITH GRANT OPTION")
			: queries("$grant ALL PRIVILEGES$on") && queries("$grant GRANT OPTION$on")
		);
	}
	return queries("$grant " . preg_replace('~(GRANT OPTION)\([^)]*\)~', '\1', implode("$columns, ", $privileges) . $columns) . $on);
}

/** Drop old object and create a new one
* @param string $drop drop old object query
* @param string $create create new object query
* @param string $drop_created drop new object query
* @param string $test create test object query
* @param string $drop_test drop test object query
* @return void redirect on success
*/
function drop_create($drop, $create, $drop_created, $test, $drop_test, $location, $message_drop, $message_alter, $message_create, $old_name, $new_name) {
	if ($_POST["drop"]) {
		query_redirect($drop, $location, $message_drop);
	} elseif ($old_name == "") {
		query_redirect($create, $location, $message_create);
	} elseif ($old_name != $new_name) {
		$created = queries($create);
		queries_redirect($location, $message_alter, $created && queries($drop));
		if ($created) {
			queries($drop_created);
		}
	} else {
		queries_redirect(
			$location,
			$message_alter,
			queries($test) && queries($drop_test) && queries($drop) && queries($create)
		);
	}
}

/** Generate SQL query for creating trigger
* @param Trigger $row
*/
function create_trigger($on, array $row) {
	$timing_event = " $row[Timing] $row[Event]" . (preg_match('~ OF~', $row["Event"]) ? " $row[Of]" : ""); // SQL injection
	return "CREATE TRIGGER "
		. idf_escape($row["Trigger"])
		. (JUSH == "mssql" ? $on . $timing_event : $timing_event . $on)
		. rtrim(" $row[Type]\n$row[Statement]", ";")
		. ";"
	;
}

/** Generate SQL query for creating routine
* @param 'PROCEDURE'|'FUNCTION' $routine
* @param Routine $row
*/
function create_routine($routine, array $row) {
	$set = array();
	$fields = (array) $row["fields"];
	ksort($fields); // enforce fields order
	foreach ($fields as $field) {
		if ($field["field"] != "") {
			$set[] = (preg_match("~^(" . driver()->inout . ")\$~", $field["inout"]) ? "$field[inout] " : "") . idf_escape($field["field"]) . process_type($field, "CHARACTER SET");
		}
	}
	$definition = rtrim($row["definition"], ";");
	return "CREATE $routine "
		. idf_escape(trim($row["name"]))
		. " (" . implode(", ", $set) . ")"
		. ($routine == "FUNCTION" ? " RETURNS" . process_type($row["returns"], "CHARACTER SET") : "")
		. ($row["language"] ? " LANGUAGE $row[language]" : "")
		. (JUSH == "pgsql" ? " AS " . q($definition) : "\n$definition;")
	;
}

/** Remove current user definer from SQL command */
function remove_definer($query) {
	return preg_replace('~^([A-Z =]+) DEFINER=`' . preg_replace('~@(.*)~', '`@`(%|\1)', logged_user()) . '`~', '\1', $query); //! proper escaping of user
}

/** Format foreign key to use in SQL query
* @param ForeignKey $foreign_key
*/
function format_foreign_key(array $foreign_key) {
	$db = $foreign_key["db"];
	$ns = $foreign_key["ns"];
	return " FOREIGN KEY (" . implode(", ", array_map('Adminer\idf_escape', $foreign_key["source"])) . ") REFERENCES "
		. ($db != "" && $db != $_GET["db"] ? idf_escape($db) . "." : "")
		. ($ns != "" && $ns != $_GET["ns"] ? idf_escape($ns) . "." : "")
		. idf_escape($foreign_key["table"])
		. " (" . implode(", ", array_map('Adminer\idf_escape', $foreign_key["target"])) . ")" //! reuse $name - check in older MySQL versions
		. (preg_match("~^(" . driver()->onActions . ")\$~", $foreign_key["on_delete"]) ? " ON DELETE $foreign_key[on_delete]" : "")
		. (preg_match("~^(" . driver()->onActions . ")\$~", $foreign_key["on_update"]) ? " ON UPDATE $foreign_key[on_update]" : "")
		. ($foreign_key["deferrable"] ? " $foreign_key[deferrable]" : "")
	;
}

/** Add a file to TAR
* @param TmpFile $tmp_file
* @return void prints the output
*/
function tar_file($filename, $tmp_file) {
	$return = pack("a100a8a8a8a12a12", $filename, 644, 0, 0, decoct($tmp_file->size), decoct(time()));
	$checksum = 8*32; // space for checksum itself
	for ($i=0; $i < strlen($return); $i++) {
		$checksum += ord($return[$i]);
	}
	$return .= sprintf("%06o", $checksum) . "\0 ";
	echo $return;
	echo str_repeat("\0", 512 - strlen($return));
	$tmp_file->send();
	echo str_repeat("\0", 511 - ($tmp_file->size + 511) % 512);
}

/** Create link to database documentation
* @param string[] $paths JUSH => $path
* @param string $text HTML code
* @return string HTML code
*/
function doc_link(array $paths, $text = "<sup>?</sup>") {
	$server_info = connection()->server_info;
	$version = preg_replace('~^(\d\.?\d).*~s', '\1', $server_info); // two most significant digits
	$urls = array(
		'sql' => "https://dev.mysql.com/doc/refman/$version/en/",
		'sqlite' => "https://www.sqlite.org/",
		'pgsql' => "https://www.postgresql.org/docs/" . (connection()->flavor == 'cockroach' ? "current" : $version) . "/",
		'mssql' => "https://learn.microsoft.com/en-us/sql/",
		'oracle' => "https://www.oracle.com/pls/topic/lookup?ctx=db" . preg_replace('~^.* (\d+)\.(\d+)\.\d+\.\d+\.\d+.*~s', '\1\2', $server_info) . "&id=",
	);
	if (connection()->flavor == 'maria') {
		$urls['sql'] = "https://mariadb.com/kb/en/";
		$paths['sql'] = (isset($paths['mariadb']) ? $paths['mariadb'] : str_replace(".html", "/", $paths['sql']));
	}
	return ($paths[JUSH] ? "<a href='" . h($urls[JUSH] . $paths[JUSH] . (JUSH == 'mssql' ? "?view=sql-server-ver$version" : "")) . "'" . target_blank() . ">$text</a>" : "");
}

/** Compute size of database
* @return string formatted
*/
function db_size($db) {
	if (!connection()->select_db($db)) {
		return "?";
	}
	$return = 0;
	foreach (table_status() as $table_status) {
		$return += $table_status["Data_length"] + $table_status["Index_length"];
	}
	return format_number($return);
}

/** Print SET NAMES if utf8mb4 might be needed */
function set_utf8mb4($create) {
	static $set = false;
	if (!$set && preg_match('~\butf8mb4~i', $create)) { // possible false positive
		$set = true;
		echo "SET NAMES " . charset(connection()) . ";\n\n";
	}
}

if (isset($_GET["status"])) {
	$_GET["variables"] = $_GET["status"];
}
if (isset($_GET["import"])) {
	$_GET["sql"] = $_GET["import"];
}

if (
	!(DB != ""
		? connection()->select_db(DB)
		: isset($_GET["sql"]) || isset($_GET["dump"]) || isset($_GET["database"]) || isset($_GET["processlist"]) || isset($_GET["privileges"]) || isset($_GET["user"]) || isset($_GET["variables"])
			|| $_GET["script"] == "connect" || $_GET["script"] == "kill"
	)
) {
	if (DB != "" || $_GET["refresh"]) {
		restart_session();
		set_session("dbs", null);
	}
	if (DB != "") {
		header("HTTP/1.1 404 Not Found");
		page_header(lang(29) . ": " . h(DB), lang(113), true);
	} else {
		if ($_POST["db"] && !$error) {
			queries_redirect(substr(ME, 0, -1), lang(114), drop_databases($_POST["db"]));
		}

		page_header(lang(115), $error, false);
		echo "<p class='links'>\n";
		foreach (
			array(
				'database' => lang(116),
				'privileges' => lang(63),
				'processlist' => lang(117),
				'variables' => lang(118),
				'status' => lang(119),
			) as $key => $val
		) {
			if (support($key)) {
				echo "<a href='" . h(ME) . "$key='>$val</a>\n";
			}
		}
		echo "<p>" . lang(120, get_driver(DRIVER), "<b>" . h(connection()->server_info) . "</b>", "<b>" . connection()->extension . "</b>") . "\n";
		echo "<p>" . lang(121, "<b>" . h(logged_user()) . "</b>") . "\n";

		$databases = adminer()->databases();
		if ($databases) {
			$scheme = support("scheme");
			$collations = collations();
			echo "<form action='' method='post'>\n";
			echo "<table class='checkable odds'>\n";
			echo script("mixin(qsl('table'), {onclick: tableClick, ondblclick: partialArg(tableClick, true)});");
			echo "<thead><tr>"
				. (support("database") ? "<td>" : "")
				. "<th>" . lang(29) . (get_session("dbs") !== null ? " - <a href='" . h(ME) . "refresh=1'>" . lang(122) . "</a>" : "")
				. "<td>" . lang(123)
				. "<td>" . lang(124)
				. "<td>" . lang(125) . " - <a href='" . h(ME) . "dbsize=1'>" . lang(126) . "</a>" . script("qsl('a').onclick = partial(ajaxSetHtml, '" . js_escape(ME) . "script=connect');", "")
				. "</thead>\n"
			;

			$databases = ($_GET["dbsize"] ? count_tables($databases) : array_flip($databases));
			foreach ($databases as $db => $tables) {
				$root = h(ME) . "db=" . urlencode($db);
				$id = h("Db-" . $db);
				echo "<tr>" . (support("database") ? "<td>" . checkbox("db[]", $db, in_array($db, (array) $_POST["db"]), "", "", "", $id) : "");
				echo "<th><a href='$root' id='$id'>" . h($db) . "</a>";
				$collation = h(db_collation($db, $collations));
				echo "<td>" . (support("database") ? "<a href='$root" . ($scheme ? "&amp;ns=" : "") . "&amp;database=' title='" . lang(59) . "'>$collation</a>" : $collation);
				echo "<td align='right'><a href='$root&amp;schema=' id='tables-" . h($db) . "' title='" . lang(62) . "'>" . ($_GET["dbsize"] ? $tables : "?") . "</a>";
				echo "<td align='right' id='size-" . h($db) . "'>" . ($_GET["dbsize"] ? db_size($db) : "?");
				echo "\n";
			}

			echo "</table>\n";
			echo (support("database")
				? "<div class='footer'><div>\n"
					. "<fieldset><legend>" . lang(127) . " <span id='selected'></span></legend><div>\n"
					. input_hidden("all") . script("qsl('input').onclick = function () { selectCount('selected', formChecked(this, /^db/)); };") // used by trCheck()
					. "<input type='submit' name='drop' value='" . lang(128) . "'>" . confirm() . "\n"
					. "</div></fieldset>\n"
					. "</div></div>\n"
				: ""
			);
			echo input_token();
			echo "</form>\n";
			echo script("tableCheck();");
		}

		if (!empty(adminer()->plugins)) {
			echo "<div class='plugins'>\n";
			echo "<h3>" . lang(129) . "</h3>\n<ul>\n";
			foreach (adminer()->plugins as $plugin) {
				$description = (method_exists($plugin, 'description') ? $plugin->description() : "");
				if (!$description) {
					$reflection = new \ReflectionObject($plugin);
					if (preg_match('~^/[\s*]+(.+)~', $reflection->getDocComment(), $match)) {
						$description = $match[1];
					}
				}
				$screenshot = (method_exists($plugin, 'screenshot') ? $plugin->screenshot() : "");
				echo "<li><b>" . get_class($plugin) . "</b>"
					. h($description ? ": $description" : "")
					. ($screenshot ? " (<a href='" . h($screenshot) . "'" . target_blank() . ">" . lang(130) . "</a>)" : "")
					. "\n"
				;
			}
			echo "</ul>\n";
			adminer()->pluginsLinks();
			echo "</div>\n";
		}
	}

	page_footer("db");
	exit;
}




adminer()->afterConnect();

class TmpFile {
	/** @var resource */ private $handler;
	/** @visibility protected(set) */ public $size;

	function __construct() {
		$this->handler = tmpfile();
	}

	function write($contents) {
		$this->size += strlen($contents);
		fwrite($this->handler, $contents);
	}

	function send() {
		fseek($this->handler, 0);
		fpassthru($this->handler);
		fclose($this->handler);
	}
}


if (isset($_GET["select"]) && ($_POST["edit"] || $_POST["clone"]) && !$_POST["save"]) {
	$_GET["edit"] = $_GET["select"];
}
// this is matched by compile.php
if (isset($_GET["callf"])) {
	$_GET["call"] = $_GET["callf"];
}
if (isset($_GET["function"])) {
	$_GET["procedure"] = $_GET["function"];
}

if (isset($_GET["download"])) {
	
$TABLE = $_GET["download"];
$fields = fields($TABLE);
header("Content-Type: application/octet-stream");
header("Content-Disposition: attachment; filename=" . friendly_url("$TABLE-" . implode("_", $_GET["where"])) . "." . friendly_url($_GET["field"]));
$select = array(idf_escape($_GET["field"]));
$result = driver()->select($TABLE, $select, array(where($_GET, $fields)), $select);
$row = ($result ? $result->fetch_row() : array());
echo driver()->value($row[0], $fields[$_GET["field"]]);
exit; // don't output footer

} elseif (isset($_GET["table"])) {
	
$TABLE = $_GET["table"];
$fields = fields($TABLE);
if (!$fields) {
	$error = error() ?: lang(11);
}
$table_status = table_status1($TABLE);
$name = adminer()->tableName($table_status);

page_header(($fields && is_view($table_status) ? $table_status['Engine'] == 'materialized view' ? lang(131) : lang(132) : lang(133)) . ": " . ($name != "" ? $name : h($TABLE)), $error);

$rights = array();
foreach ($fields as $key => $field) {
	$rights += $field["privileges"];
}
adminer()->selectLinks($table_status, (isset($rights["insert"]) || !support("table") ? "" : null));

$comment = $table_status["Comment"];
if ($comment != "") {
	echo "<p class='nowrap'>" . lang(42) . ": " . h($comment) . "\n";
}

if ($fields) {
	adminer()->tableStructurePrint($fields, $table_status);
}

/** Print links to tables
* @param list<array{table: string, ns: string}> $tables
*/
function tables_links(array $tables) {
	echo "<ul>\n";
	foreach ($tables as $row) {
		$link = preg_replace('~ns=[^&]*~', "ns=" . urlencode($row["ns"]), ME);
		echo "<li><a href='" . h($link . "table=" . urlencode($row["table"])) . "'>" . ($row["ns"] != $_GET["ns"] ? "<b>" . h($row["ns"]) . "</b>." : "") . h($row["table"]) . "</a>";
	}
	echo "</ul>\n";
}

$inherits = driver()->inheritsFrom($TABLE);
if ($inherits) {
	echo "<h3>" . lang(134) . "</h3>\n";
	tables_links($inherits);
}

if (support("indexes") && driver()->supportsIndex($table_status)) {
	echo "<h3 id='indexes'>" . lang(135) . "</h3>\n";
	$indexes = indexes($TABLE);
	if ($indexes) {
		adminer()->tableIndexesPrint($indexes, $table_status);
	}
	echo '<p class="links"><a href="' . h(ME) . 'indexes=' . urlencode($TABLE) . '">' . lang(136) . "</a>\n";
}

if (!is_view($table_status)) {
	if (fk_support($table_status)) {
		echo "<h3 id='foreign-keys'>" . lang(101) . "</h3>\n";
		$foreign_keys = foreign_keys($TABLE);
		if ($foreign_keys) {
			echo "<table>\n";
			echo "<thead><tr><th>" . lang(137) . "<td>" . lang(138) . "<td>" . lang(104) . "<td>" . lang(103) . "<td></thead>\n";
			foreach ($foreign_keys as $name => $foreign_key) {
				echo "<tr title='" . h($name) . "'>";
				echo "<th><i>" . implode("</i>, <i>", array_map('Adminer\h', $foreign_key["source"])) . "</i>";
				$link = ($foreign_key["db"] != ""
					? preg_replace('~db=[^&]*~', "db=" . urlencode($foreign_key["db"]), ME)
					: ($foreign_key["ns"] != "" ? preg_replace('~ns=[^&]*~', "ns=" . urlencode($foreign_key["ns"]), ME) : ME)
				);
				echo "<td><a href='" . h($link . "table=" . urlencode($foreign_key["table"])) . "'>"
					. ($foreign_key["db"] != "" && $foreign_key["db"] != DB ? "<b>" . h($foreign_key["db"]) . "</b>." : "")
					. ($foreign_key["ns"] != "" && $foreign_key["ns"] != $_GET["ns"] ? "<b>" . h($foreign_key["ns"]) . "</b>." : "")
					. h($foreign_key["table"])
					. "</a>"
				;
				echo "(<i>" . implode("</i>, <i>", array_map('Adminer\h', $foreign_key["target"])) . "</i>)";
				echo "<td>" . h($foreign_key["on_delete"]);
				echo "<td>" . h($foreign_key["on_update"]);
				echo '<td><a href="' . h(ME . 'foreign=' . urlencode($TABLE) . '&name=' . urlencode($name)) . '">' . lang(139) . '</a>';
				echo "\n";
			}
			echo "</table>\n";
		}
		echo '<p class="links"><a href="' . h(ME) . 'foreign=' . urlencode($TABLE) . '">' . lang(140) . "</a>\n";
	}

	if (support("check")) {
		echo "<h3 id='checks'>" . lang(141) . "</h3>\n";
		$check_constraints = driver()->checkConstraints($TABLE);
		if ($check_constraints) {
			echo "<table>\n";
			foreach ($check_constraints as $key => $val) {
				echo "<tr title='" . h($key) . "'>";
				echo "<td><code class='jush-" . JUSH . "'>" . h($val);
				echo "<td><a href='" . h(ME . 'check=' . urlencode($TABLE) . '&name=' . urlencode($key)) . "'>" . lang(139) . "</a>";
				echo "\n";
			}
			echo "</table>\n";
		}
		echo '<p class="links"><a href="' . h(ME) . 'check=' . urlencode($TABLE) . '">' . lang(142) . "</a>\n";
	}
}

if (support(is_view($table_status) ? "view_trigger" : "trigger")) {
	echo "<h3 id='triggers'>" . lang(143) . "</h3>\n";
	$triggers = triggers($TABLE);
	if ($triggers) {
		echo "<table>\n";
		foreach ($triggers as $key => $val) {
			echo "<tr valign='top'><td>" . h($val[0]) . "<td>" . h($val[1]) . "<th>" . h($key) . "<td><a href='" . h(ME . 'trigger=' . urlencode($TABLE) . '&name=' . urlencode($key)) . "'>" . lang(139) . "</a>\n";
		}
		echo "</table>\n";
	}
	echo '<p class="links"><a href="' . h(ME) . 'trigger=' . urlencode($TABLE) . '">' . lang(144) . "</a>\n";
}

$inherited = driver()->inheritedTables($TABLE);
if ($inherited) {
	echo "<h3 id='partitions'>" . lang(145) . "</h3>\n";
	$partition = driver()->partitionsInfo($TABLE);
	if ($partition) {
		echo "<p><code class='jush-" . JUSH . "'>BY " . h("$partition[partition_by]($partition[partition])") . "</code>\n";
	}
	tables_links($inherited);
}

} elseif (isset($_GET["schema"])) {
	
page_header(lang(62), "", array(), h(DB . ($_GET["ns"] ? ".$_GET[ns]" : "")));

/** @var array{float, float}[] */
$table_pos = array();
$table_pos_js = array();
$SCHEMA = ($_GET["schema"] ?: $_COOKIE["adminer_schema-" . str_replace(".", "_", DB)]); // $_COOKIE["adminer_schema"] was used before 3.2.0 //! ':' in table name
preg_match_all('~([^:]+):([-0-9.]+)x([-0-9.]+)(_|$)~', $SCHEMA, $matches, PREG_SET_ORDER);
foreach ($matches as $i => $match) {
	$table_pos[$match[1]] = array($match[2], $match[3]);
	$table_pos_js[] = "\n\t'" . js_escape($match[1]) . "': [ $match[2], $match[3] ]";
}

$top = 0;
$base_left = -1;
/** @var array{fields:Field[], pos:array{float, float}, references:string[][][]}[] */
$schema = array(); // table => array("fields" => array(name => field), "pos" => array(top, left), "references" => array(table => array(left => array(source, target))))
$referenced = array(); // target_table => array(table => array(left => target_column))
/** @var array<numeric-string, bool> */
$lefts = array();
$all_fields = driver()->allFields();
foreach (table_status('', true) as $table => $table_status) {
	if (is_view($table_status)) {
		continue;
	}
	$pos = 0;
	$schema[$table]["fields"] = array();
	foreach ($all_fields[$table] as $field) {
		$pos += 1.25;
		$field["pos"] = $pos;
		$schema[$table]["fields"][$field["field"]] = $field;
	}
	$schema[$table]["pos"] = ($table_pos[$table] ?: array($top, 0));
	foreach (adminer()->foreignKeys($table) as $val) {
		if (!$val["db"]) {
			$left = $base_left;
			if (idx($table_pos[$table], 1) || idx($table_pos[$val["table"]], 1)) {
				$left = min(idx($table_pos[$table], 1, 0), idx($table_pos[$val["table"]], 1, 0)) - 1;
			} else {
				$base_left -= .1;
			}
			while ($lefts[(string) $left]) {
				// find free $left
				$left -= .0001;
			}
			$schema[$table]["references"][$val["table"]][(string) $left] = array($val["source"], $val["target"]);
			$referenced[$val["table"]][$table][(string) $left] = $val["target"];
			$lefts[(string) $left] = true;
		}
	}
	$top = max($top, $schema[$table]["pos"][0] + 2.5 + $pos);
}

?>
<div id="schema" style="height: <?php echo $top; ?>em;">
<script<?php echo nonce(); ?>>
qs('#schema').onselectstart = () => false;
const tablePos = {<?php echo implode(",", $table_pos_js) . "\n"; ?>};
const em = qs('#schema').offsetHeight / <?php echo $top; ?>;
document.onmousemove = schemaMousemove;
document.onmouseup = partialArg(schemaMouseup, '<?php echo js_escape(DB); ?>');
</script>
<?php
foreach ($schema as $name => $table) {
	echo "<div class='table' style='top: " . $table["pos"][0] . "em; left: " . $table["pos"][1] . "em;'>";
	echo '<a href="' . h(ME) . 'table=' . urlencode($name) . '"><b>' . h($name) . "</b></a>";
	echo script("qsl('div').onmousedown = schemaMousedown;");

	foreach ($table["fields"] as $field) {
		$val = '<span' . type_class($field["type"]) . ' title="' . h($field["type"] . ($field["length"] ? "($field[length])" : "") . ($field["null"] ? " NULL" : '')) . '">' . h($field["field"]) . '</span>';
		echo "<br>" . ($field["primary"] ? "<i>$val</i>" : $val);
	}

	foreach ((array) $table["references"] as $target_name => $refs) {
		foreach ($refs as $left => $ref) {
			$left1 = $left - idx($table_pos[$name], 1);
			$i = 0;
			foreach ($ref[0] as $source) {
				echo "\n<div class='references' title='" . h($target_name) . "' id='refs$left-" . ($i++) . "' style='left: $left1" . "em; top: " . $table["fields"][$source]["pos"] . "em; padding-top: .5em;'>"
					. "<div style='border-top: 1px solid gray; width: " . (-$left1) . "em;'></div></div>"
				;
			}
		}
	}

	foreach ((array) $referenced[$name] as $target_name => $refs) {
		foreach ($refs as $left => $columns) {
			$left1 = $left - idx($table_pos[$name], 1);
			$i = 0;
			foreach ($columns as $target) {
				echo "\n<div class='references arrow' title='" . h($target_name) . "' id='refd$left-" . ($i++) . "' style='left: $left1" . "em; top: " . $table["fields"][$target]["pos"] . "em;'>"
					. "<div style='height: .5em; border-bottom: 1px solid gray; width: " . (-$left1) . "em;'></div>"
					. "</div>"
				;
			}
		}
	}

	echo "\n</div>\n";
}

foreach ($schema as $name => $table) {
	foreach ((array) $table["references"] as $target_name => $refs) {
		foreach ($refs as $left => $ref) {
			$min_pos = $top;
			$max_pos = -10;
			foreach ($ref[0] as $key => $source) {
				$pos1 = $table["pos"][0] + $table["fields"][$source]["pos"];
				$pos2 = $schema[$target_name]["pos"][0] + $schema[$target_name]["fields"][$ref[1][$key]]["pos"];
				$min_pos = min($min_pos, $pos1, $pos2);
				$max_pos = max($max_pos, $pos1, $pos2);
			}
			echo "<div class='references' id='refl$left' style='left: $left" . "em; top: $min_pos" . "em; padding: .5em 0;'><div style='border-right: 1px solid gray; margin-top: 1px; height: " . ($max_pos - $min_pos) . "em;'></div></div>\n";
		}
	}
}
?>
</div>
<p class="links"><a href="<?php echo h(ME . "schema=" . urlencode($SCHEMA)); ?>" id="schema-link"><?php echo lang(146); ?></a>
<?php
} elseif (isset($_GET["dump"])) {
	
$TABLE = $_GET["dump"];

if ($_POST && !$error) {
	save_settings(
		array_intersect_key($_POST, array_flip(array("output", "format", "db_style", "types", "routines", "events", "table_style", "auto_increment", "triggers", "data_style"))),
		"adminer_export"
	);
	$tables = array_flip((array) $_POST["tables"]) + array_flip((array) $_POST["data"]);
	$ext = dump_headers(
		(count($tables) == 1 ? key($tables) : DB),
		(DB == "" || count($tables) > 1)
	);
	$is_sql = preg_match('~sql~', $_POST["format"]);

	if ($is_sql) {
		echo "-- Adminer " . VERSION . " " . get_driver(DRIVER) . " " . str_replace("\n", " ", connection()->server_info) . " dump\n\n";
		if (JUSH == "sql") {
			echo "SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
" . ($_POST["data_style"] ? "SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';
" : "") . "
";
			connection()->query("SET time_zone = '+00:00'");
			connection()->query("SET sql_mode = ''");
		}
	}

	$style = $_POST["db_style"];
	$databases = array(DB);
	if (DB == "") {
		$databases = $_POST["databases"];
		if (is_string($databases)) {
			$databases = explode("\n", rtrim(str_replace("\r", "", $databases), "\n"));
		}
	}

	foreach ((array) $databases as $db) {
		adminer()->dumpDatabase($db);
		if (connection()->select_db($db)) {
			if ($is_sql) {
				if ($style) {
					echo use_sql($db, $style) . ";\n\n";
				}
				$out = "";

				if ($_POST["types"]) {
					foreach (types() as $id => $type) {
						$enums = type_values($id);
						if ($enums) {
							$out .= ($style != 'DROP+CREATE' ? "DROP TYPE IF EXISTS " . idf_escape($type) . ";;\n" : "") . "CREATE TYPE " . idf_escape($type) . " AS ENUM ($enums);\n\n";
						} else {
							//! https://github.com/postgres/postgres/blob/REL_17_4/src/bin/pg_dump/pg_dump.c#L10846
							$out .= "-- Could not export type $type\n\n";
						}
					}
				}

				if ($_POST["routines"]) {
					foreach (routines() as $row) {
						$name = $row["ROUTINE_NAME"];
						$routine = $row["ROUTINE_TYPE"];
						$create = create_routine($routine, array("name" => $name) + routine($row["SPECIFIC_NAME"], $routine));
						set_utf8mb4($create);
						$out .= ($style != 'DROP+CREATE' ? "DROP $routine IF EXISTS " . idf_escape($name) . ";;\n" : "") . "$create;\n\n";
					}
				}

				if ($_POST["events"]) {
					foreach (get_rows("SHOW EVENTS", null, "-- ") as $row) {
						$create = remove_definer(get_val("SHOW CREATE EVENT " . idf_escape($row["Name"]), 3));
						set_utf8mb4($create);
						$out .= ($style != 'DROP+CREATE' ? "DROP EVENT IF EXISTS " . idf_escape($row["Name"]) . ";;\n" : "") . "$create;;\n\n";
					}
				}

				echo ($out && JUSH == 'sql' ? "DELIMITER ;;\n\n$out" . "DELIMITER ;\n\n" : $out);
			}

			if ($_POST["table_style"] || $_POST["data_style"]) {
				$views = array();
				foreach (table_status('', true) as $name => $table_status) {
					$table = (DB == "" || in_array($name, (array) $_POST["tables"]));
					$data = (DB == "" || in_array($name, (array) $_POST["data"]));
					if ($table || $data) {
						$tmp_file = null;
						if ($ext == "tar") {
							$tmp_file = new TmpFile;
							ob_start(array($tmp_file, 'write'), 1e5);
						}

						adminer()->dumpTable($name, ($table ? $_POST["table_style"] : ""), (is_view($table_status) ? 2 : 0));
						if (is_view($table_status)) {
							$views[] = $name;
						} elseif ($data) {
							$fields = fields($name);
							adminer()->dumpData($name, $_POST["data_style"], "SELECT *" . convert_fields($fields, $fields) . " FROM " . table($name));
						}
						if ($is_sql && $_POST["triggers"] && $table && ($triggers = trigger_sql($name))) {
							echo "\nDELIMITER ;;\n$triggers\nDELIMITER ;\n";
						}

						if ($ext == "tar") {
							ob_end_flush();
							tar_file((DB != "" ? "" : "$db/") . "$name.csv", $tmp_file);
						} elseif ($is_sql) {
							echo "\n";
						}
					}
				}

				// add FKs after creating tables (except in MySQL which uses SET FOREIGN_KEY_CHECKS=0)
				if (function_exists('Adminer\foreign_keys_sql')) {
					foreach (table_status('', true) as $name => $table_status) {
						$table = (DB == "" || in_array($name, (array) $_POST["tables"]));
						if ($table && !is_view($table_status)) {
							echo foreign_keys_sql($name);
						}
					}
				}

				foreach ($views as $view) {
					adminer()->dumpTable($view, $_POST["table_style"], 1);
				}

				if ($ext == "tar") {
					echo pack("x512");
				}
			}
		}
	}

	adminer()->dumpFooter();
	exit;
}

page_header(lang(68), $error, ($_GET["export"] != "" ? array("table" => $_GET["export"]) : array()), h(DB));
?>

<form action="" method="post">
<table class="layout">
<?php
$db_style = array('', 'USE', 'DROP+CREATE', 'CREATE');
$table_style = array('', 'DROP+CREATE', 'CREATE');
$data_style = array('', 'TRUNCATE+INSERT', 'INSERT');
if (JUSH == "sql") { //! use insertUpdate() in all drivers
	$data_style[] = 'INSERT+UPDATE';
}
$row = get_settings("adminer_export");
if (!$row) {
	$row = array("output" => "text", "format" => "sql", "db_style" => (DB != "" ? "" : "CREATE"), "table_style" => "DROP+CREATE", "data_style" => "INSERT");
}
if (!isset($row["events"])) { // backwards compatibility
	$row["routines"] = $row["events"] = ($_GET["dump"] == "");
	$row["triggers"] = $row["table_style"];
}

echo "<tr><th>" . lang(147) . "<td>" . html_radios("output", adminer()->dumpOutput(), $row["output"]) . "\n";

echo "<tr><th>" . lang(148) . "<td>" . html_radios("format", adminer()->dumpFormat(), $row["format"]) . "\n";

echo (JUSH == "sqlite" ? "" : "<tr><th>" . lang(29) . "<td>" . html_select('db_style', $db_style, $row["db_style"])
	. (support("type") ? checkbox("types", 1, $row["types"], lang(6)) : "")
	. (support("routine") ? checkbox("routines", 1, $row["routines"], lang(64)) : "")
	. (support("event") ? checkbox("events", 1, $row["events"], lang(66)) : "")
);

echo "<tr><th>" . lang(124) . "<td>" . html_select('table_style', $table_style, $row["table_style"])
	. checkbox("auto_increment", 1, $row["auto_increment"], lang(43))
	. (support("trigger") ? checkbox("triggers", 1, $row["triggers"], lang(143)) : "")
;

echo "<tr><th>" . lang(149) . "<td>" . html_select('data_style', $data_style, $row["data_style"]);
?>
</table>
<p><input type="submit" value="<?php echo lang(68); ?>">
<?php echo input_token(); ?>

<table>
<?php
echo script("qsl('table').onclick = dumpClick;");
$prefixes = array();
if (DB != "") {
	$checked = ($TABLE != "" ? "" : " checked");
	echo "<thead><tr>";
	echo "<th style='text-align: left;'><label class='block'><input type='checkbox' id='check-tables'$checked>" . lang(124) . "</label>" . script("qs('#check-tables').onclick = partial(formCheck, /^tables\\[/);", "");
	echo "<th style='text-align: right;'><label class='block'>" . lang(149) . "<input type='checkbox' id='check-data'$checked></label>" . script("qs('#check-data').onclick = partial(formCheck, /^data\\[/);", "");
	echo "</thead>\n";

	$views = "";
	$tables_list = tables_list();
	foreach ($tables_list as $name => $type) {
		$prefix = preg_replace('~_.*~', '', $name);
		$checked = ($TABLE == "" || $TABLE == (substr($TABLE, -1) == "%" ? "$prefix%" : $name)); //! % may be part of table name
		$print = "<tr><td>" . checkbox("tables[]", $name, $checked, $name, "", "block");
		if ($type !== null && !preg_match('~table~i', $type)) {
			$views .= "$print\n";
		} else {
			echo "$print<td align='right'><label class='block'><span id='Rows-" . h($name) . "'></span>" . checkbox("data[]", $name, $checked) . "</label>\n";
		}
		$prefixes[$prefix]++;
	}
	echo $views;

	if ($tables_list) {
		echo script("ajaxSetHtml('" . js_escape(ME) . "script=db');");
	}

} else {
	echo "<thead><tr><th style='text-align: left;'>";
	echo "<label class='block'><input type='checkbox' id='check-databases'" . ($TABLE == "" ? " checked" : "") . ">" . lang(29) . "</label>";
	echo script("qs('#check-databases').onclick = partial(formCheck, /^databases\\[/);", "");
	echo "</thead>\n";
	$databases = adminer()->databases();
	if ($databases) {
		foreach ($databases as $db) {
			if (!information_schema($db)) {
				$prefix = preg_replace('~_.*~', '', $db);
				echo "<tr><td>" . checkbox("databases[]", $db, $TABLE == "" || $TABLE == "$prefix%", $db, "", "block") . "\n";
				$prefixes[$prefix]++;
			}
		}
	} else {
		echo "<tr><td><textarea name='databases' rows='10' cols='20'></textarea>";
	}
}
?>
</table>
</form>
<?php
$first = true;
foreach ($prefixes as $key => $val) {
	if ($key != "" && $val > 1) {
		echo ($first ? "<p>" : " ") . "<a href='" . h(ME) . "dump=" . urlencode("$key%") . "'>" . h($key) . "</a>";
		$first = false;
	}
}

} elseif (isset($_GET["privileges"])) {
	
page_header(lang(63));

echo '<p class="links"><a href="' . h(ME) . 'user=">' . lang(150) . "</a>";

$result = connection()->query("SELECT User, Host FROM mysql." . (DB == "" ? "user" : "db WHERE " . q(DB) . " LIKE Db") . " ORDER BY Host, User");
$grant = $result;
if (!$result) {
	// list logged user, information_schema.USER_PRIVILEGES lists just the current user too
	$result = connection()->query("SELECT SUBSTRING_INDEX(CURRENT_USER, '@', 1) AS User, SUBSTRING_INDEX(CURRENT_USER, '@', -1) AS Host");
}

echo "<form action=''><p>\n";
hidden_fields_get();
echo input_hidden("db", DB);
echo ($grant ? "" : input_hidden("grant"));
echo "<table class='odds'>\n";
echo "<thead><tr><th>" . lang(27) . "<th>" . lang(25) . "<th></thead>\n";

while ($row = $result->fetch_assoc()) {
	echo '<tr><td>' . h($row["User"]) . "<td>" . h($row["Host"]) . '<td><a href="' . h(ME . 'user=' . urlencode($row["User"]) . '&host=' . urlencode($row["Host"])) . '">' . lang(12) . "</a>\n";
}

if (!$grant || DB != "") {
	echo "<tr><td><input name='user' autocapitalize='off'><td><input name='host' value='localhost' autocapitalize='off'><td><input type='submit' value='" . lang(12) . "'>\n";
}

echo "</table>\n";
echo "</form>\n";

} elseif (isset($_GET["sql"])) {
	
if (!$error && $_POST["export"]) {
	save_settings(array("output" => $_POST["output"], "format" => $_POST["format"]), "adminer_import");
	dump_headers("sql");
	if ($_POST["format"] == "sql") {
		echo "$_POST[query]\n";
	} else {
		adminer()->dumpTable("", "");
		adminer()->dumpData("", "table", $_POST["query"]);
		adminer()->dumpFooter();
	}
	exit;
}

restart_session();
$history_all = &get_session("queries");
$history = &$history_all[DB];
if (!$error && $_POST["clear"]) {
	$history = array();
	redirect(remove_from_uri("history"));
}
stop_session();

page_header((isset($_GET["import"]) ? lang(67) : lang(56)), $error);
$line_comment = '--' . (JUSH == 'sql' ? ' ' : '');

if (!$error && $_POST) {
	$fp = false;
	if (!isset($_GET["import"])) {
		$query = $_POST["query"];
	} elseif ($_POST["webfile"]) {
		$sql_file_path = adminer()->importServerPath();
		$fp = @fopen((file_exists($sql_file_path)
			? $sql_file_path
			: "compress.zlib://$sql_file_path.gz"
		), "rb");
		$query = ($fp ? fread($fp, 1e6) : false);
	} else {
		$query = get_file("sql_file", true, ";");
	}

	if (is_string($query)) { // get_file() returns error as number, fread() as false
		if (function_exists('memory_get_usage') && ($memory_limit = ini_bytes("memory_limit")) != "-1") {
			@ini_set("memory_limit", max($memory_limit, strval(2 * strlen($query) + memory_get_usage() + 8e6))); // @ - may be disabled, 2 - substr and trim, 8e6 - other variables
		}

		if ($query != "" && strlen($query) < 1e6) { // don't add big queries
			$q = $query . (preg_match("~;[ \t\r\n]*\$~", $query) ? "" : ";"); //! doesn't work with DELIMITER |
			if (!$history || first(end($history)) != $q) { // no repeated queries
				restart_session();
				$history[] = array($q, time()); //! add elapsed time
				set_session("queries", $history_all); // required because reference is unlinked by stop_session()
				stop_session();
			}
		}

		$space = "(?:\\s|/\\*[\s\S]*?\\*/|(?:#|$line_comment)[^\n]*\n?|--\r?\n)";
		$delimiter = driver()->delimiter;
		$offset = 0;
		$empty = true;
		$connection2 = connect(); // connection for exploring indexes and EXPLAIN (to not replace FOUND_ROWS()) //! PDO - silent error
		if ($connection2 && DB != "") {
			$connection2->select_db(DB);
			if ($_GET["ns"] != "") {
				set_schema($_GET["ns"], $connection2);
			}
		}
		$commands = 0;
		$errors = array();
		$parse = '[\'"' . (JUSH == "sql" ? '`#' : (JUSH == "sqlite" ? '`[' : (JUSH == "mssql" ? '[' : ''))) . ']|/\*|' . $line_comment . '|$' . (JUSH == "pgsql" ? '|\$([a-zA-Z]\w*)?\$' : '');
		$total_start = microtime(true);
		$adminer_export = get_settings("adminer_import"); // this doesn't offer SQL export so we match the import/export style at select

		while ($query != "") {
			if (!$offset && preg_match("~^$space*+DELIMITER\\s+(\\S+)~i", $query, $match)) {
				$delimiter = preg_quote($match[1]);
				$query = substr($query, strlen($match[0]));
			} elseif (!$offset && JUSH == 'pgsql' && preg_match("~^($space*+COPY\\s+)[^;]+\\s+FROM\\s+stdin;~i", $query, $match)) {
				$delimiter = "\n\\\\\\.\r?\n";
				$offset = strlen($match[0]);
			} else {
				preg_match("($delimiter\\s*|$parse)", $query, $match, PREG_OFFSET_CAPTURE, $offset); // always matches
				list($found, $pos) = $match[0];
				if (!$found && $fp && !feof($fp)) {
					$query .= fread($fp, 1e5);
				} else {
					if (!$found && rtrim($query) == "") {
						break;
					}
					$offset = $pos + strlen($found);

					if ($found && !preg_match("(^$delimiter)", $found)) { // find matching quote or comment end
						$c_style_escapes = driver()->hasCStyleEscapes() || (JUSH == "pgsql" && ($pos > 0 && strtolower($query[$pos - 1]) == "e"));

						$pattern =
							($found == '/*' ? '\*/' :
							($found == '[' ? ']' :
							(preg_match("~^$line_comment|^#~", $found) ? "\n" :
							preg_quote($found) . ($c_style_escapes ? '|\\\\.' : ''))))
						;

						while (preg_match("($pattern|\$)s", $query, $match, PREG_OFFSET_CAPTURE, $offset)) {
							$s = $match[0][0];
							if (!$s && $fp && !feof($fp)) {
								$query .= fread($fp, 1e5);
							} else {
								$offset = $match[0][1] + strlen($s);
								if (!$s || $s[0] != "\\") {
									break;
								}
							}
						}

					} else { // end of a query
						$empty = false;
						$q = substr($query, 0, $pos + ($delimiter[0] == "\n" ? 3 : 0)); // 3 - pass "\n\\." to PostgreSQL COPY
						$commands++;
						$print = "<pre id='sql-$commands'><code class='jush-" . JUSH . "'>" . adminer()->sqlCommandQuery($q) . "</code></pre>\n";
						if (JUSH == "sqlite" && preg_match("~^$space*+ATTACH\\b~i", $q, $match)) {
							// PHP doesn't support setting SQLITE_LIMIT_ATTACHED
							echo $print;
							echo "<p class='error'>" . lang(151) . "\n";
							$errors[] = " <a href='#sql-$commands'>$commands</a>";
							if ($_POST["error_stops"]) {
								break;
							}
						} else {
							if (!$_POST["only_errors"]) {
								echo $print;
								ob_flush();
								flush(); // can take a long time - show the running query
							}
							$start = microtime(true);
							//! don't allow changing of character_set_results, convert encoding of displayed query
							if (connection()->multi_query($q) && $connection2 && preg_match("~^$space*+USE\\b~i", $q)) {
								$connection2->query($q);
							}

							do {
								$result = connection()->store_result();

								if (connection()->error) {
									echo ($_POST["only_errors"] ? $print : "");
									echo "<p class='error'>" . lang(152) . (connection()->errno ? " (" . connection()->errno . ")" : "") . ": " . error() . "\n";
									$errors[] = " <a href='#sql-$commands'>$commands</a>";
									if ($_POST["error_stops"]) {
										break 2;
									}

								} else {
									$time = " <span class='time'>(" . format_time($start) . ")</span>"
										. (strlen($q) < 1000 ? " <a href='" . h(ME) . "sql=" . urlencode(trim($q)) . "'>" . lang(12) . "</a>" : "") // 1000 - maximum length of encoded URL in IE is 2083 characters
									;
									$affected = connection()->affected_rows; // getting warnings overwrites this
									$warnings = ($_POST["only_errors"] ? "" : driver()->warnings());
									$warnings_id = "warnings-$commands";
									if ($warnings) {
										$time .= ", <a href='#$warnings_id'>" . lang(38) . "</a>" . script("qsl('a').onclick = partial(toggle, '$warnings_id');", "");
									}
									$explain = null;
									$orgtables = null;
									$explain_id = "explain-$commands";
									if (is_object($result)) {
										$limit = $_POST["limit"];
										$orgtables = print_select_result($result, $connection2, array(), $limit);
										if (!$_POST["only_errors"]) {
											echo "<form action='' method='post'>\n";
											$num_rows = $result->num_rows;
											echo "<p class='sql-footer'>" . ($num_rows ? ($limit && $num_rows > $limit ? lang(153, $limit) : "") . lang(154, $num_rows) : "");
											echo $time;
											if ($connection2 && preg_match("~^($space|\\()*+SELECT\\b~i", $q) && ($explain = explain($connection2, $q))) {
												echo ", <a href='#$explain_id'>Explain</a>" . script("qsl('a').onclick = partial(toggle, '$explain_id');", "");
											}
											$id = "export-$commands";
											echo ", <a href='#$id'>" . lang(68) . "</a>" . script("qsl('a').onclick = partial(toggle, '$id');", "") . "<span id='$id' class='hidden'>: "
												. html_select("output", adminer()->dumpOutput(), $adminer_export["output"]) . " "
												. html_select("format", adminer()->dumpFormat(), $adminer_export["format"])
												. input_hidden("query", $q)
												. "<input type='submit' name='export' value='" . lang(68) . "'>" . input_token() . "</span>\n"
												. "</form>\n"
											;
										}

									} else {
										if (preg_match("~^$space*+(CREATE|DROP|ALTER)$space++(DATABASE|SCHEMA)\\b~i", $q)) {
											restart_session();
											set_session("dbs", null); // clear cache
											stop_session();
										}
										if (!$_POST["only_errors"]) {
											echo "<p class='message' title='" . h(connection()->info) . "'>" . lang(155, $affected) . "$time\n";
										}
									}
									echo ($warnings ? "<div id='$warnings_id' class='hidden'>\n$warnings</div>\n" : "");
									if ($explain) {
										echo "<div id='$explain_id' class='hidden explain'>\n";
										print_select_result($explain, $connection2, $orgtables);
										echo "</div>\n";
									}
								}

								$start = microtime(true);
							} while (connection()->next_result());
						}

						$query = substr($query, $offset);
						$offset = 0;
					}

				}
			}
		}

		if ($empty) {
			echo "<p class='message'>" . lang(156) . "\n";
		} elseif ($_POST["only_errors"]) {
			echo "<p class='message'>" . lang(157, $commands - count($errors));
			echo " <span class='time'>(" . format_time($total_start) . ")</span>\n";
		} elseif ($errors && $commands > 1) {
			echo "<p class='error'>" . lang(152) . ": " . implode("", $errors) . "\n";
		}
		//! MS SQL - SET SHOWPLAN_ALL OFF

	} else {
		echo "<p class='error'>" . upload_error($query) . "\n";
	}
}
?>

<form action="" method="post" enctype="multipart/form-data" id="form">
<?php
$execute = "<input type='submit' value='" . lang(158) . "' title='Ctrl+Enter'>";
if (!isset($_GET["import"])) {
	$q = $_GET["sql"]; // overwrite $q from if ($_POST) to save memory
	if ($_POST) {
		$q = $_POST["query"];
	} elseif ($_GET["history"] == "all") {
		$q = $history;
	} elseif ($_GET["history"] != "") {
		$q = idx($history[$_GET["history"]], 0);
	}
	echo "<p>";
	textarea("query", $q, 20);
	echo script(($_POST ? "" : "qs('textarea').focus();\n") . "qs('#form').onsubmit = partial(sqlSubmit, qs('#form'), '" . js_escape(remove_from_uri("sql|limit|error_stops|only_errors|history")) . "');");
	echo "<p>";
	adminer()->sqlPrintAfter();
	echo "$execute\n";
	echo lang(159) . ": <input type='number' name='limit' class='size' value='" . h($_POST ? $_POST["limit"] : $_GET["limit"]) . "'>\n";

} else {
	$gz = (extension_loaded("zlib") ? "[.gz]" : "");
	echo "<fieldset><legend>" . lang(160) . "</legend><div>";
	echo file_input("SQL$gz: <input type='file' name='sql_file[]' multiple>\n$execute");
	echo "</div></fieldset>\n";
	$importServerPath = adminer()->importServerPath();
	if ($importServerPath) {
		echo "<fieldset><legend>" . lang(161) . "</legend><div>";
		echo lang(162, "<code>" . h($importServerPath) . "$gz</code>");
		echo ' <input type="submit" name="webfile" value="' . lang(163) . '">';
		echo "</div></fieldset>\n";
	}
	echo "<p>";
}

echo checkbox("error_stops", 1, ($_POST ? $_POST["error_stops"] : isset($_GET["import"]) || $_GET["error_stops"]), lang(164)) . "\n";
echo checkbox("only_errors", 1, ($_POST ? $_POST["only_errors"] : isset($_GET["import"]) || $_GET["only_errors"]), lang(165)) . "\n";
echo input_token();

if (!isset($_GET["import"]) && $history) {
	print_fieldset("history", lang(166), $_GET["history"] != "");
	for ($val = end($history); $val; $val = prev($history)) { // not array_reverse() to save memory
		$key = key($history);
		list($q, $time, $elapsed) = $val;
		echo '<a href="' . h(ME . "sql=&history=$key") . '">' . lang(12) . "</a>"
			. " <span class='time' title='" . @date('Y-m-d', $time) . "'>" . @date("H:i:s", $time) . "</span>" // @ - time zone may be not set
			. " <code class='jush-" . JUSH . "'>" . shorten_utf8(ltrim(str_replace("\n", " ", str_replace("\r", "", preg_replace("~^(#|$line_comment).*~m", '', $q)))), 80, "</code>")
			. ($elapsed ? " <span class='time'>($elapsed)</span>" : "")
			. "<br>\n"
		;
	}
	echo "<input type='submit' name='clear' value='" . lang(167) . "'>\n";
	echo "<a href='" . h(ME . "sql=&history=all") . "'>" . lang(168) . "</a>\n";
	echo "</div></fieldset>\n";
}
?>
</form>
<?php
} elseif (isset($_GET["edit"])) {
	
$TABLE = $_GET["edit"];
$fields = fields($TABLE);
$where = (isset($_GET["select"])
	? ($_POST["check"] && count($_POST["check"]) == 1 ? where_check($_POST["check"][0], $fields) : "")
	: where($_GET, $fields)
);
$update = (isset($_GET["select"]) ? $_POST["edit"] : $where);
foreach ($fields as $name => $field) {
	if ((!$update && !isset($field["privileges"]["insert"])) || adminer()->fieldName($field) == "") {
		unset($fields[$name]);
	}
}

if ($_POST && !$error && !isset($_GET["select"])) {
	$location = $_POST["referer"];
	if ($_POST["insert"]) { // continue edit or insert
		$location = ($update ? null : $_SERVER["REQUEST_URI"]);
	} elseif (!preg_match('~^.+&select=.+$~', $location)) {
		$location = ME . "select=" . urlencode($TABLE);
	}

	$indexes = indexes($TABLE);
	$unique_array = unique_array($_GET["where"], $indexes);
	$query_where = "\nWHERE $where";

	if (isset($_POST["delete"])) {
		queries_redirect(
			$location,
			lang(169),
			driver()->delete($TABLE, $query_where, $unique_array ? 0 : 1)
		);

	} else {
		$set = array();
		foreach ($fields as $name => $field) {
			$val = process_input($field);
			if ($val !== false && $val !== null) {
				$set[idf_escape($name)] = $val;
			}
		}

		if ($update) {
			if (!$set) {
				redirect($location);
			}
			queries_redirect(
				$location,
				lang(170),
				driver()->update($TABLE, $set, $query_where, $unique_array ? 0 : 1)
			);
			if (is_ajax()) {
				page_headers();
				page_messages($error);
				exit;
			}
		} else {
			$result = driver()->insert($TABLE, $set);
			$last_id = ($result ? last_id($result) : 0);
			queries_redirect($location, lang(171, ($last_id ? " $last_id" : "")), $result); //! link
		}
	}
}

$row = null;
if ($where) {
	$select = array();
	foreach ($fields as $name => $field) {
		if (isset($field["privileges"]["select"])) {
			$as = ($_POST["clone"] && $field["auto_increment"] ? "''" : convert_field($field));
			$select[] = ($as ? "$as AS " : "") . idf_escape($name);
		}
	}
	$row = array();
	if (!support("table")) {
		$select = array("*");
	}
	if ($select) {
		$result = driver()->select($TABLE, $select, array($where), $select, array(), (isset($_GET["select"]) ? 2 : 1));
		if (!$result) {
			$error = error();
		} else {
			$row = $result->fetch_assoc();
			if (!$row) { // MySQLi returns null
				$row = false;
			}
		}
		if (isset($_GET["select"]) && (!$row || $result->fetch_assoc())) { // $result->num_rows != 1 isn't available in all drivers
			$row = null;
		}
	}
}

if (!support("table") && !$fields) { // used by Mongo and SimpleDB
	if (!$where) { // insert
		$result = driver()->select($TABLE, array("*"), array(), array("*"));
		$row = ($result ? $result->fetch_assoc() : false);
		if (!$row) {
			$row = array(driver()->primary => "");
		}
	}
	if ($row) {
		foreach ($row as $key => $val) {
			if (!$where) {
				$row[$key] = null;
			}
			$fields[$key] = array("field" => $key, "null" => ($key != driver()->primary), "auto_increment" => ($key == driver()->primary));
		}
	}
}

if ($_POST["save"]) {
	$row = (array) $_POST["fields"] + ($row ? $row : array());
}

edit_form($TABLE, $fields, $row, $update, $error);

} elseif (isset($_GET["create"])) {
	
$TABLE = $_GET["create"];
$partition_by = driver()->partitionBy;
$partitions_info = ($partition_by ? driver()->partitionsInfo($TABLE) : array());

$referencable_primary = referencable_primary($TABLE);
$foreign_keys = array();
foreach ($referencable_primary as $table_name => $field) {
	$foreign_keys[str_replace("`", "``", $table_name) . "`" . str_replace("`", "``", $field["field"])] = $table_name; // not idf_escape() - used in JS
}

$orig_fields = array();
$table_status = array();
if ($TABLE != "") {
	$orig_fields = fields($TABLE);
	$table_status = table_status1($TABLE);
	if (count($table_status) < 2) { // there's only the Name field
		$error = lang(11);
	}
}

$row = $_POST;
$row["fields"] = (array) $row["fields"];
if ($row["auto_increment_col"]) {
	$row["fields"][$row["auto_increment_col"]]["auto_increment"] = true;
}

if ($_POST) {
	save_settings(array("comments" => $_POST["comments"], "defaults" => $_POST["defaults"]));
}

if ($_POST && !process_fields($row["fields"]) && !$error) {
	if ($_POST["drop"]) {
		queries_redirect(substr(ME, 0, -1), lang(172), drop_tables(array($TABLE)));
	} else {
		$fields = array();
		$all_fields = array();
		$use_all_fields = false;
		$foreign = array();
		$orig_field = reset($orig_fields);
		$after = " FIRST";

		foreach ($row["fields"] as $key => $field) {
			$foreign_key = $foreign_keys[$field["type"]];
			$type_field = ($foreign_key !== null ? $referencable_primary[$foreign_key] : $field); //! can collide with user defined type
			if ($field["field"] != "") {
				if (!$field["generated"]) {
					$field["default"] = null;
				}
				$process_field = process_field($field, $type_field);
				$all_fields[] = array($field["orig"], $process_field, $after);
				if (!$orig_field || $process_field !== process_field($orig_field, $orig_field)) {
					$fields[] = array($field["orig"], $process_field, $after);
					if ($field["orig"] != "" || $after) {
						$use_all_fields = true;
					}
				}
				if ($foreign_key !== null) {
					$foreign[idf_escape($field["field"])] = ($TABLE != "" && JUSH != "sqlite" ? "ADD" : " ") . format_foreign_key(array(
						'table' => $foreign_keys[$field["type"]],
						'source' => array($field["field"]),
						'target' => array($type_field["field"]),
						'on_delete' => $field["on_delete"],
					));
				}
				$after = " AFTER " . idf_escape($field["field"]);
			} elseif ($field["orig"] != "") {
				$use_all_fields = true;
				$fields[] = array($field["orig"]);
			}
			if ($field["orig"] != "") {
				$orig_field = next($orig_fields);
				if (!$orig_field) {
					$after = "";
				}
			}
		}

		$partitioning = array();
		if (in_array($row["partition_by"], $partition_by)) {
			foreach ($row as $key => $val) {
				if (preg_match('~^partition~', $key)) {
					$partitioning[$key] = $val;
				}
			}
			foreach ($partitioning["partition_names"] as $key => $name) {
				if ($name == "") {
					unset($partitioning["partition_names"][$key]);
					unset($partitioning["partition_values"][$key]);
				}
			}
			$partitioning["partition_names"] = array_values($partitioning["partition_names"]);
			$partitioning["partition_values"] = array_values($partitioning["partition_values"]);
			if ($partitioning == $partitions_info) {
				$partitioning = array();
			}
		} elseif (preg_match("~partitioned~", $table_status["Create_options"])) {
			$partitioning = null;
		}

		$message = lang(173);
		if ($TABLE == "") {
			cookie("adminer_engine", $row["Engine"]);
			$message = lang(174);
		}
		$name = trim($row["name"]);

		queries_redirect(ME . (support("table") ? "table=" : "select=") . urlencode($name), $message, alter_table(
			$TABLE,
			$name,
			(JUSH == "sqlite" && ($use_all_fields || $foreign) ? $all_fields : $fields),
			$foreign,
			($row["Comment"] != $table_status["Comment"] ? $row["Comment"] : null),
			($row["Engine"] && $row["Engine"] != $table_status["Engine"] ? $row["Engine"] : ""),
			($row["Collation"] && $row["Collation"] != $table_status["Collation"] ? $row["Collation"] : ""),
			($row["Auto_increment"] != "" ? number($row["Auto_increment"]) : ""),
			$partitioning
		));
	}
}

page_header(($TABLE != "" ? lang(36) : lang(69)), $error, array("table" => $TABLE), h($TABLE));

if (!$_POST) {
	$types = driver()->types();
	$row = array(
		"Engine" => $_COOKIE["adminer_engine"],
		"fields" => array(array("field" => "", "type" => (isset($types["int"]) ? "int" : (isset($types["integer"]) ? "integer" : "")), "on_update" => "")),
		"partition_names" => array(""),
	);

	if ($TABLE != "") {
		$row = $table_status;
		$row["name"] = $TABLE;
		$row["fields"] = array();
		if (!$_GET["auto_increment"]) { // don't prefill by original Auto_increment for the sake of performance and not reusing deleted ids
			$row["Auto_increment"] = "";
		}
		foreach ($orig_fields as $field) {
			$field["generated"] = $field["generated"] ?: (isset($field["default"]) ? "DEFAULT" : "");
			$row["fields"][] = $field;
		}

		if ($partition_by) {
			$row += $partitions_info;
			$row["partition_names"][] = "";
			$row["partition_values"][] = "";
		}
	}
}

$collations = collations();
if (is_array(reset($collations))) {
	$collations = call_user_func_array('array_merge', array_values($collations));
}
$engines = driver()->engines();
// case of engine may differ
foreach ($engines as $engine) {
	if (!strcasecmp($engine, $row["Engine"])) {
		$row["Engine"] = $engine;
		break;
	}
}
?>

<form action="" method="post" id="form">
<p>
<?php
if (support("columns") || $TABLE == "") {
	echo lang(175) . ": <input name='name'" . ($TABLE == "" && !$_POST ? " autofocus" : "") . " data-maxlength='64' value='" . h($row["name"]) . "' autocapitalize='off'>\n";
	echo ($engines ? html_select("Engine", array("" => "(" . lang(176) . ")") + $engines, $row["Engine"]) . on_help("event.target.value", 1) . script("qsl('select').onchange = helpClose;") . "\n" : "");
	if ($collations) {
		echo "<datalist id='collations'>" . optionlist($collations) . "</datalist>\n";
		echo (preg_match("~sqlite|mssql~", JUSH) ? "" : "<input list='collations' name='Collation' value='" . h($row["Collation"]) . "' placeholder='(" . lang(102) . ")'>\n");
	}
	echo "<input type='submit' value='" . lang(16) . "'>\n";
}

if (support("columns")) {
	echo "<div class='scrollable'>\n";
	echo "<table id='edit-fields' class='nowrap'>\n";
	edit_fields($row["fields"], $collations, "TABLE", $foreign_keys);
	echo "</table>\n";
	echo script("editFields();");
	echo "</div>\n<p>\n";
	echo lang(43) . ": <input type='number' name='Auto_increment' class='size' value='" . h($row["Auto_increment"]) . "'>\n";
	echo checkbox("defaults", 1, ($_POST ? $_POST["defaults"] : get_setting("defaults")), lang(177), "columnShow(this.checked, 5)", "jsonly");
	$comments = ($_POST ? $_POST["comments"] : get_setting("comments"));
	echo (support("comment")
		? checkbox("comments", 1, $comments, lang(42), "editingCommentsClick(this, true);", "jsonly")
			. ' ' . (preg_match('~\n~', $row["Comment"])
				? "<textarea name='Comment' rows='2' cols='20'" . ($comments ? "" : " class='hidden'") . ">" . h($row["Comment"]) . "</textarea>"
				: '<input name="Comment" value="' . h($row["Comment"]) . '" data-maxlength="' . (min_version(5.5) ? 2048 : 60) . '"' . ($comments ? "" : " class='hidden'") . '>'
			)
		: '')
	;
	?>
<p>
<input type="submit" value="<?php echo lang(16); ?>">
<?php } ?>

<?php if ($TABLE != "") { ?>
<input type="submit" name="drop" value="<?php echo lang(128); ?>"><?php echo confirm(lang(178, $TABLE));  } 
if ($partition_by && (JUSH == 'sql' || $TABLE == "")) {
	$partition_table = preg_match('~RANGE|LIST~', $row["partition_by"]);
	print_fieldset("partition", lang(179), $row["partition_by"]);
	echo "<p>" . html_select("partition_by", array_merge(array(""), $partition_by), $row["partition_by"]) . on_help("event.target.value.replace(/./, 'PARTITION BY \$&')", 1) . script("qsl('select').onchange = partitionByChange;");
	echo "(<input name='partition' value='" . h($row["partition"]) . "'>)\n";
	echo lang(180) . ": <input type='number' name='partitions' class='size" . ($partition_table || !$row["partition_by"] ? " hidden" : "") . "' value='" . h($row["partitions"]) . "'>\n";
	echo "<table id='partition-table'" . ($partition_table ? "" : " class='hidden'") . ">\n";
	echo "<thead><tr><th>" . lang(181) . "<th>" . lang(182) . "</thead>\n";
	foreach ($row["partition_names"] as $key => $val) {
		echo '<tr>';
		echo '<td><input name="partition_names[]" value="' . h($val) . '" autocapitalize="off">';
		echo ($key == count($row["partition_names"]) - 1 ? script("qsl('input').oninput = partitionNameChange;") : '');
		echo '<td><input name="partition_values[]" value="' . h(idx($row["partition_values"], $key)) . '">';
	}
	echo "</table>\n</div></fieldset>\n";
}
echo input_token();
?>
</form>
<?php
} elseif (isset($_GET["indexes"])) {
	
$TABLE = $_GET["indexes"];
$index_types = array("PRIMARY", "UNIQUE", "INDEX");
$table_status = table_status1($TABLE, true);
$index_algorithms = driver()->indexAlgorithms($table_status);
if (preg_match('~MyISAM|M?aria' . (min_version(5.6, '10.0.5') ? '|InnoDB' : '') . '~i', $table_status["Engine"])) {
	$index_types[] = "FULLTEXT";
}
if (preg_match('~MyISAM|M?aria' . (min_version(5.7, '10.2.2') ? '|InnoDB' : '') . '~i', $table_status["Engine"])) {
	$index_types[] = "SPATIAL";
}
$indexes = indexes($TABLE);
$fields = fields($TABLE);
$primary = array();
if (JUSH == "mongo") { // doesn't support primary key
	$primary = $indexes["_id_"];
	unset($index_types[0]);
	unset($indexes["_id_"]);
}
$row = $_POST;
if ($row) {
	save_settings(array("index_options" => $row["options"]));
}
if ($_POST && !$error && !$_POST["add"] && !$_POST["drop_col"]) {
	$alter = array();
	foreach ($row["indexes"] as $index) {
		$name = $index["name"];
		if (in_array($index["type"], $index_types)) {
			$columns = array();
			$lengths = array();
			$descs = array();
			$index_condition = (support("partial_indexes") ? $index["partial"] : "");
			$index_algorithm = (in_array($index["algorithm"], $index_algorithms) ? $index["algorithm"] : "");
			$set = array();
			ksort($index["columns"]);
			foreach ($index["columns"] as $key => $column) {
				if ($column != "") {
					$length = idx($index["lengths"], $key);
					$desc = idx($index["descs"], $key);
					$set[] = ($fields[$column] ? idf_escape($column) : $column) . ($length ? "(" . (+$length) . ")" : "") . ($desc ? " DESC" : "");
					$columns[] = $column;
					$lengths[] = ($length ?: null);
					$descs[] = $desc;
				}
			}

			$existing = $indexes[$name];
			if ($existing) {
				ksort($existing["columns"]);
				ksort($existing["lengths"]);
				ksort($existing["descs"]);
				if (
					$index["type"] == $existing["type"]
					&& array_values($existing["columns"]) === $columns
					&& (!$existing["lengths"] || array_values($existing["lengths"]) === $lengths)
					&& array_values($existing["descs"]) === $descs
					&& $existing["partial"] == $index_condition
					&& (!$index_algorithms || $existing["algorithm"] == $index_algorithm)
				) {
					// skip existing index
					unset($indexes[$name]);
					continue;
				}
			}
			if ($columns) {
				$alter[] = array($index["type"], $name, $set, $index_algorithm, $index_condition);
			}
		}
	}

	// drop removed indexes
	foreach ($indexes as $name => $existing) {
		$alter[] = array($existing["type"], $name, "DROP");
	}
	if (!$alter) {
		redirect(ME . "table=" . urlencode($TABLE));
	}
	queries_redirect(ME . "table=" . urlencode($TABLE), lang(183), alter_indexes($TABLE, $alter));
}

page_header(lang(135), $error, array("table" => $TABLE), h($TABLE));

$fields_keys = array_keys($fields);
if ($_POST["add"]) {
	foreach ($row["indexes"] as $key => $index) {
		if ($index["columns"][count($index["columns"])] != "") {
			$row["indexes"][$key]["columns"][] = "";
		}
	}
	$index = end($row["indexes"]);
	if ($index["type"] || array_filter($index["columns"], 'strlen')) {
		$row["indexes"][] = array("columns" => array(1 => ""));
	}
}
if (!$row) {
	foreach ($indexes as $key => $index) {
		$indexes[$key]["name"] = $key;
		$indexes[$key]["columns"][] = "";
	}
	$indexes[] = array("columns" => array(1 => ""));
	$row["indexes"] = $indexes;
}
$lengths = (JUSH == "sql" || JUSH == "mssql");
$show_options = ($_POST ? $_POST["options"] : get_setting("index_options"));
?>

<form action="" method="post">
<div class="scrollable">
<table class="nowrap">
<thead><tr>
<th id="label-type"><?php echo lang(184); 
$idxopts = " class='idxopts" . ($show_options ? "" : " hidden") . "'";
if ($index_algorithms) {
	echo "<th id='label-algorithm'$idxopts>" . lang(185) . doc_link(array(
		'sql' => 'create-index.html#create-index-storage-engine-index-types',
		'mariadb' => 'storage-engine-index-types/',
		
	));
}
?>
<th><input type="submit" class="wayoff"><?php
echo lang(186) . ($lengths ? "<span$idxopts> (" . lang(187) . ")</span>" : "");
if ($lengths || support("descidx")) {
	echo checkbox("options", 1, $show_options, lang(108), "indexOptionsShow(this.checked)", "jsonly") . "\n";
}
?>
<th id="label-name"><?php echo lang(188); 
if (support("partial_indexes")) {
	echo "<th id='label-condition'$idxopts>" . lang(189);
}
?>
<th><noscript><?php echo icon("plus", "add[0]", "+", lang(109)); ?></noscript>
</thead>
<?php
if ($primary) {
	echo "<tr><td>PRIMARY<td>";
	foreach ($primary["columns"] as $key => $column) {
		echo select_input(" disabled", $fields_keys, $column);
		echo "<label><input disabled type='checkbox'>" . lang(51) . "</label> ";
	}
	echo "<td><td>\n";
}
$j = 1;
foreach ($row["indexes"] as $index) {
	if (!$_POST["drop_col"] || $j != key($_POST["drop_col"])) {
		echo "<tr><td>" . html_select("indexes[$j][type]", array(-1 => "") + $index_types, $index["type"], ($j == count($row["indexes"]) ? "indexesAddRow.call(this);" : ""), "label-type");

		if ($index_algorithms) {
			echo "<td$idxopts>" . html_select("indexes[$j][algorithm]", array_merge(array(""), $index_algorithms), $index['algorithm'], "label-algorithm");
		}

		echo "<td>";
		ksort($index["columns"]);
		$i = 1;
		foreach ($index["columns"] as $key => $column) {
			echo "<span>" . select_input(
				" name='indexes[$j][columns][$i]' title='" . lang(40) . "'",
				($fields && ($column == "" || $fields[$column]) ? array_combine($fields_keys, $fields_keys) : array()),
				$column,
				"partial(" . ($i == count($index["columns"]) ? "indexesAddColumn" : "indexesChangeColumn") . ", '" . js_escape(JUSH == "sql" ? "" : $_GET["indexes"] . "_") . "')"
			);
			echo "<span$idxopts>";
			echo ($lengths ? "<input type='number' name='indexes[$j][lengths][$i]' class='size' value='" . h(idx($index["lengths"], $key)) . "' title='" . lang(107) . "'>" : "");
			echo (support("descidx") ? checkbox("indexes[$j][descs][$i]", 1, idx($index["descs"], $key), lang(51)) : "");
			echo "</span> </span>";
			$i++;
		}

		echo "<td><input name='indexes[$j][name]' value='" . h($index["name"]) . "' autocapitalize='off' aria-labelledby='label-name'>\n";
		if (support("partial_indexes")) {
			echo "<td$idxopts><input name='indexes[$j][partial]' value='" . h($index["partial"]) . "' autocapitalize='off' aria-labelledby='label-condition'>\n";
		}
		echo "<td>" . icon("cross", "drop_col[$j]", "x", lang(112)) . script("qsl('button').onclick = partial(editingRemoveRow, 'indexes\$1[type]');");
	}
	$j++;
}
?>
</table>
</div>
<p>
<input type="submit" value="<?php echo lang(16); ?>">
<?php echo input_token(); ?>
</form>
<?php
} elseif (isset($_GET["database"])) {
	
$row = $_POST;

if ($_POST && !$error && !$_POST["add"]) {
	$name = trim($row["name"]);
	if ($_POST["drop"]) {
		$_GET["db"] = ""; // to save in global history
		queries_redirect(remove_from_uri("db|database"), lang(190), drop_databases(array(DB)));
	} elseif (DB !== $name) {
		// create or rename database
		if (DB != "") {
			$_GET["db"] = $name;
			queries_redirect(preg_replace('~\bdb=[^&]*&~', '', ME) . "db=" . urlencode($name), lang(191), rename_database($name, $row["collation"]));
		} else {
			$databases = explode("\n", str_replace("\r", "", $name));
			$success = true;
			$last = "";
			foreach ($databases as $db) {
				if (count($databases) == 1 || $db != "") { // ignore empty lines but always try to create single database
					if (!create_database($db, $row["collation"])) {
						$success = false;
					}
					$last = $db;
				}
			}
			restart_session();
			set_session("dbs", null);
			queries_redirect(ME . "db=" . urlencode($last), lang(192), $success);
		}
	} else {
		// alter database
		if (!$row["collation"]) {
			redirect(substr(ME, 0, -1));
		}
		query_redirect("ALTER DATABASE " . idf_escape($name) . (preg_match('~^[a-z0-9_]+$~i', $row["collation"]) ? " COLLATE $row[collation]" : ""), substr(ME, 0, -1), lang(193));
	}
}

page_header(DB != "" ? lang(59) : lang(116), $error, array(), h(DB));

$collations = collations();
$name = DB;
if ($_POST) {
	$name = $row["name"];
} elseif (DB != "") {
	$row["collation"] = db_collation(DB, $collations);
} elseif (JUSH == "sql") {
	// propose database name with limited privileges
	foreach (get_vals("SHOW GRANTS") as $grant) {
		if (preg_match('~ ON (`(([^\\\\`]|``|\\\\.)*)%`\.\*)?~', $grant, $match) && $match[1]) {
			$name = stripcslashes(idf_unescape("`$match[2]`"));
			break;
		}
	}
}
?>

<form action="" method="post">
<p>
<?php
echo ($_POST["add"] || strpos($name, "\n")
	? '<textarea autofocus name="name" rows="10" cols="40">' . h($name) . '</textarea><br>'
	: '<input name="name" autofocus value="' . h($name) . '" data-maxlength="64" autocapitalize="off">'
) . "\n" . ($collations ? html_select("collation", array("" => "(" . lang(102) . ")") + $collations, $row["collation"]) . doc_link(array(
	'sql' => "charset-charsets.html",
	'mariadb' => "supported-character-sets-and-collations/",
	
)) : "");
?>
<input type="submit" value="<?php echo lang(16); ?>">
<?php
if (DB != "") {
	echo "<input type='submit' name='drop' value='" . lang(128) . "'>" . confirm(lang(178, DB)) . "\n";
} elseif (!$_POST["add"] && $_GET["db"] == "") {
	echo icon("plus", "add[0]", "+", lang(109)) . "\n";
}
echo input_token();
?>
</form>
<?php
} elseif (isset($_GET["call"])) {
	
$PROCEDURE = ($_GET["name"] ?: $_GET["call"]);
page_header(lang(194) . ": " . h($PROCEDURE), $error);

$routine = routine($_GET["call"], (isset($_GET["callf"]) ? "FUNCTION" : "PROCEDURE"));
$in = array();
$out = array();
foreach ($routine["fields"] as $i => $field) {
	if (substr($field["inout"], -3) == "OUT" && JUSH == 'sql') {
		$out[$i] = "@" . idf_escape($field["field"]) . " AS " . idf_escape($field["field"]);
	}
	if (!$field["inout"] || substr($field["inout"], 0, 2) == "IN") {
		$in[] = $i;
	}
}

if (!$error && $_POST) {
	$call = array();
	foreach ($routine["fields"] as $key => $field) {
		$val = "";
		if (in_array($key, $in)) {
			$val = process_input($field);
			if ($val === false) {
				$val = "''";
			}
			if (isset($out[$key])) {
				connection()->query("SET @" . idf_escape($field["field"]) . " = $val");
			}
		}
		if (isset($out[$key])) {
			$call[] = "@" . idf_escape($field["field"]);
		} elseif (in_array($key, $in)) {
			$call[] = $val;
		}
	}

	$query = (isset($_GET["callf"]) ? "SELECT " : "CALL ") . (idx($routine["returns"], "type") == "record" ? "* FROM " : "") . table($PROCEDURE) . "(" . implode(", ", $call) . ")";
	$start = microtime(true);
	$result = connection()->multi_query($query);
	$affected = connection()->affected_rows; // getting warnings overwrites this
	echo adminer()->selectQuery($query, $start, !$result);

	if (!$result) {
		echo "<p class='error'>" . error() . "\n";
	} else {
		$connection2 = connect();
		if ($connection2) {
			$connection2->select_db(DB);
		}

		do {
			$result = connection()->store_result();
			if (is_object($result)) {
				print_select_result($result, $connection2);
			} else {
				echo "<p class='message'>" . lang(195, $affected)
					. " <span class='time'>" . @date("H:i:s") . "</span>\n" // @ - time zone may be not set
				;
			}
		} while (connection()->next_result());

		if ($out) {
			print_select_result(connection()->query("SELECT " . implode(", ", $out)));
		}
	}
}
?>

<form action="" method="post">
<?php
if ($in) {
	echo "<table class='layout'>\n";
	foreach ($in as $key) {
		$field = $routine["fields"][$key];
		$name = $field["field"];
		echo "<tr><th>" . adminer()->fieldName($field);
		$value = idx($_POST["fields"], $name);
		if ($value != "") {
			if ($field["type"] == "set") {
				$value = implode(",", $value);
			}
		}
		input($field, $value, idx($_POST["function"], $name, "")); // param name can be empty
		echo "\n";
	}
	echo "</table>\n";
}
?>
<p>
<input type="submit" value="<?php echo lang(194); ?>">
<?php echo input_token(); ?>
</form>

<pre>
<?php
/** Format string as table row
* @return string HTML
*/
function pre_tr($s) {
	return preg_replace('~^~m', '<tr>', preg_replace('~\|~', '<td>', preg_replace('~\|$~m', "", rtrim($s))));
}

$table = '(\+--[-+]+\+\n)';
$row = '(\| .* \|\n)';
echo preg_replace_callback(
	"~^$table?$row$table?($row*)$table?~m",
	function ($match) {
		$first_row = pre_tr($match[2]);
		return "<table>\n" . ($match[1] ? "<thead>$first_row</thead>\n" : $first_row) . pre_tr($match[4]) . "\n</table>";
	},
	preg_replace(
		'~(\n(    -|mysql)&gt; )(.+)~',
		"\\1<code class='jush-sql'>\\3</code>",
		preg_replace('~(.+)\n---+\n~', "<b>\\1</b>\n", h($routine['comment']))
	)
);
?>
</pre>
<?php
} elseif (isset($_GET["foreign"])) {
	
$TABLE = $_GET["foreign"];
$name = $_GET["name"];
$row = $_POST;

if ($_POST && !$error && !$_POST["add"] && !$_POST["change"] && !$_POST["change-js"]) {
	if (!$_POST["drop"]) {
		$row["source"] = array_filter($row["source"], 'strlen');
		ksort($row["source"]); // enforce input order
		$target = array();
		foreach ($row["source"] as $key => $val) {
			$target[$key] = $row["target"][$key];
		}
		$row["target"] = $target;
	}

	if (JUSH == "sqlite") {
		$result = recreate_table($TABLE, $TABLE, array(), array(), array(" $name" => ($row["drop"] ? "" : " " . format_foreign_key($row))));
	} else {
		$alter = "ALTER TABLE " . table($TABLE);
		$result = ($name == "" || queries("$alter DROP " . (JUSH == "sql" ? "FOREIGN KEY " : "CONSTRAINT ") . idf_escape($name)));
		if (!$row["drop"]) {
			$result = queries("$alter ADD" . format_foreign_key($row));
		}
	}
	queries_redirect(
		ME . "table=" . urlencode($TABLE),
		($row["drop"] ? lang(196) : ($name != "" ? lang(197) : lang(198))),
		$result
	);
	if (!$row["drop"]) {
		$error = lang(199); //! no partitioning
	}
}

page_header(lang(200), $error, array("table" => $TABLE), h($TABLE));

if ($_POST) {
	ksort($row["source"]);
	if ($_POST["add"]) {
		$row["source"][] = "";
	} elseif ($_POST["change"] || $_POST["change-js"]) {
		$row["target"] = array();
	}
} elseif ($name != "") {
	$foreign_keys = foreign_keys($TABLE);
	$row = $foreign_keys[$name];
	$row["source"][] = "";
} else {
	$row["table"] = $TABLE;
	$row["source"] = array("");
}
?>

<form action="" method="post">
<?php
$source = array_keys(fields($TABLE)); //! no text and blob
if ($row["db"] != "") {
	connection()->select_db($row["db"]);
}
if ($row["ns"] != "") {
	$orig_schema = get_schema();
	set_schema($row["ns"]);
}
$referencable = array_keys(array_filter(table_status('', true), 'Adminer\fk_support'));
$target = array_keys(fields(in_array($row["table"], $referencable) ? $row["table"] : reset($referencable)));
$onchange = "this.form['change-js'].value = '1'; this.form.submit();";
echo "<p><label>" . lang(201) . ": " . html_select("table", $referencable, $row["table"], $onchange) . "</label>\n";
if (JUSH != "sqlite") {
	$dbs = array();
	foreach (adminer()->databases() as $db) {
		if (!information_schema($db)) {
			$dbs[] = $db;
		}
	}
	echo "<label>" . lang(70) . ": " . html_select("db", $dbs, $row["db"] != "" ? $row["db"] : $_GET["db"], $onchange) . "</label>";
}
echo input_hidden("change-js");
?>
<noscript><p><input type="submit" name="change" value="<?php echo lang(202); ?>"></noscript>
<table>
<thead><tr><th id="label-source"><?php echo lang(137); ?><th id="label-target"><?php echo lang(138); ?></thead>
<?php
$j = 0;
foreach ($row["source"] as $key => $val) {
	echo "<tr>";
	echo "<td>" . html_select("source[" . (+$key) . "]", array(-1 => "") + $source, $val, ($j == count($row["source"]) - 1 ? "foreignAddRow.call(this);" : ""), "label-source");
	echo "<td>" . html_select("target[" . (+$key) . "]", $target, idx($row["target"], $key), "", "label-target");
	$j++;
}
?>
</table>
<p>
<label><?php echo lang(104); ?>: <?php echo html_select("on_delete", array(-1 => "") + explode("|", driver()->onActions), $row["on_delete"]); ?></label>
<label><?php echo lang(103); ?>: <?php echo html_select("on_update", array(-1 => "") + explode("|", driver()->onActions), $row["on_update"]); ?></label>
<?php echo (DRIVER === 'pgsql' ? html_select("deferrable", array('NOT DEFERRABLE', 'DEFERRABLE', 'DEFERRABLE INITIALLY DEFERRED'), $row["deferrable"]) . ' ' : '');  echo doc_link(array(
	'sql' => "innodb-foreign-key-constraints.html",
	'mariadb' => "foreign-keys/",
	
	
	
)); ?>
<p>
<input type="submit" value="<?php echo lang(16); ?>">
<noscript><p><input type="submit" name="add" value="<?php echo lang(203); ?>"></noscript>
<?php if ($name != "") { ?>
<input type="submit" name="drop" value="<?php echo lang(128); ?>"><?php echo confirm(lang(178, $name));  }  echo input_token(); ?>
</form>
<?php
} elseif (isset($_GET["view"])) {
	
$TABLE = $_GET["view"];
$row = $_POST;
$orig_type = "VIEW";
if (JUSH == "pgsql" && $TABLE != "") {
	$status = table_status1($TABLE);
	$orig_type = strtoupper($status["Engine"]);
}

if ($_POST && !$error) {
	$name = trim($row["name"]);
	$as = " AS\n$row[select]";
	$location = ME . "table=" . urlencode($name);
	$message = lang(204);

	$type = ($_POST["materialized"] ? "MATERIALIZED VIEW" : "VIEW");

	if (!$_POST["drop"] && $TABLE == $name && JUSH != "sqlite" && $type == "VIEW" && $orig_type == "VIEW") {
		query_redirect((JUSH == "mssql" ? "ALTER" : "CREATE OR REPLACE") . " VIEW " . table($name) . $as, $location, $message);
	} else {
		$temp_name = $name . "_adminer_" . uniqid();
		drop_create(
			"DROP $orig_type " . table($TABLE),
			"CREATE $type " . table($name) . $as,
			"DROP $type " . table($name),
			"CREATE $type " . table($temp_name) . $as,
			"DROP $type " . table($temp_name),
			($_POST["drop"] ? substr(ME, 0, -1) : $location),
			lang(205),
			$message,
			lang(206),
			$TABLE,
			$name
		);
	}
}

if (!$_POST && $TABLE != "") {
	$row = view($TABLE);
	$row["name"] = $TABLE;
	$row["materialized"] = ($orig_type != "VIEW");
	if (!$error) {
		$error = error();
	}
}

page_header(($TABLE != "" ? lang(35) : lang(207)), $error, array("table" => $TABLE), h($TABLE));
?>

<form action="" method="post">
<p><?php echo lang(188); ?>: <input name="name" value="<?php echo h($row["name"]); ?>" data-maxlength="64" autocapitalize="off">
<?php echo (support("materializedview") ? " " . checkbox("materialized", 1, $row["materialized"], lang(131)) : ""); ?>
<p><?php textarea("select", $row["select"]); ?>
<p>
<input type="submit" value="<?php echo lang(16); ?>">
<?php if ($TABLE != "") { ?>
<input type="submit" name="drop" value="<?php echo lang(128); ?>"><?php echo confirm(lang(178, $TABLE));  }  echo input_token(); ?>
</form>
<?php
} elseif (isset($_GET["event"])) {
	
$EVENT = $_GET["event"];
$intervals = array("YEAR", "QUARTER", "MONTH", "DAY", "HOUR", "MINUTE", "WEEK", "SECOND", "YEAR_MONTH", "DAY_HOUR", "DAY_MINUTE", "DAY_SECOND", "HOUR_MINUTE", "HOUR_SECOND", "MINUTE_SECOND");
$statuses = array("ENABLED" => "ENABLE", "DISABLED" => "DISABLE", "SLAVESIDE_DISABLED" => "DISABLE ON SLAVE");
$row = $_POST;

if ($_POST && !$error) {
	if ($_POST["drop"]) {
		query_redirect("DROP EVENT " . idf_escape($EVENT), substr(ME, 0, -1), lang(208));
	} elseif (in_array($row["INTERVAL_FIELD"], $intervals) && isset($statuses[$row["STATUS"]])) {
		$schedule = "\nON SCHEDULE " . ($row["INTERVAL_VALUE"]
			? "EVERY " . q($row["INTERVAL_VALUE"]) . " $row[INTERVAL_FIELD]"
			. ($row["STARTS"] ? " STARTS " . q($row["STARTS"]) : "")
			. ($row["ENDS"] ? " ENDS " . q($row["ENDS"]) : "") //! ALTER EVENT doesn't drop ENDS - MySQL bug #39173
			: "AT " . q($row["STARTS"])
			) . " ON COMPLETION" . ($row["ON_COMPLETION"] ? "" : " NOT") . " PRESERVE"
		;

		queries_redirect(
			substr(ME, 0, -1),
			($EVENT != "" ? lang(209) : lang(210)),
			queries(
				($EVENT != ""
				? "ALTER EVENT " . idf_escape($EVENT) . $schedule . ($EVENT != $row["EVENT_NAME"] ? "\nRENAME TO " . idf_escape($row["EVENT_NAME"]) : "")
				: "CREATE EVENT " . idf_escape($row["EVENT_NAME"]) . $schedule
				) . "\n" . $statuses[$row["STATUS"]] . " COMMENT " . q($row["EVENT_COMMENT"])
				. rtrim(" DO\n$row[EVENT_DEFINITION]", ";") . ";"
			)
		);
	}
}

page_header(($EVENT != "" ? lang(211) . ": " . h($EVENT) : lang(212)), $error);

if (!$row && $EVENT != "") {
	$rows = get_rows("SELECT * FROM information_schema.EVENTS WHERE EVENT_SCHEMA = " . q(DB) . " AND EVENT_NAME = " . q($EVENT));
	$row = reset($rows);
}
?>

<form action="" method="post">
<table class="layout">
<tr><th><?php echo lang(188); ?><td><input name="EVENT_NAME" value="<?php echo h($row["EVENT_NAME"]); ?>" data-maxlength="64" autocapitalize="off">
<tr><th title="datetime"><?php echo lang(213); ?><td><input name="STARTS" value="<?php echo h("$row[EXECUTE_AT]$row[STARTS]"); ?>">
<tr><th title="datetime"><?php echo lang(214); ?><td><input name="ENDS" value="<?php echo h($row["ENDS"]); ?>">
<tr><th><?php echo lang(215); ?><td><input type="number" name="INTERVAL_VALUE" value="<?php echo h($row["INTERVAL_VALUE"]); ?>" class="size"> <?php echo html_select("INTERVAL_FIELD", $intervals, $row["INTERVAL_FIELD"]); ?>
<tr><th><?php echo lang(119); ?><td><?php echo html_select("STATUS", $statuses, $row["STATUS"]); ?>
<tr><th><?php echo lang(42); ?><td><input name="EVENT_COMMENT" value="<?php echo h($row["EVENT_COMMENT"]); ?>" data-maxlength="64">
<tr><th><td><?php echo checkbox("ON_COMPLETION", "PRESERVE", $row["ON_COMPLETION"] == "PRESERVE", lang(216)); ?>
</table>
<p><?php textarea("EVENT_DEFINITION", $row["EVENT_DEFINITION"]); ?>
<p>
<input type="submit" value="<?php echo lang(16); ?>">
<?php if ($EVENT != "") { ?>
<input type="submit" name="drop" value="<?php echo lang(128); ?>"><?php echo confirm(lang(178, $EVENT));  }  echo input_token(); ?>
</form>
<?php
} elseif (isset($_GET["procedure"])) {
	
$PROCEDURE = ($_GET["name"] ?: $_GET["procedure"]);
$routine = (isset($_GET["function"]) ? "FUNCTION" : "PROCEDURE");
$row = $_POST;
$row["fields"] = (array) $row["fields"];

if ($_POST && !process_fields($row["fields"]) && !$error) {
	$orig = routine($_GET["procedure"], $routine);
	$temp_name = "$row[name]_adminer_" . uniqid();
	foreach ($row["fields"] as $key => $field) {
		if ($field["field"] == "") {
			unset($row["fields"][$key]);
		}
	}
	drop_create(
		"DROP $routine " . routine_id($PROCEDURE, $orig),
		create_routine($routine, $row),
		"DROP $routine " . routine_id($row["name"], $row),
		create_routine($routine, array("name" => $temp_name) + $row),
		"DROP $routine " . routine_id($temp_name, $row),
		substr(ME, 0, -1),
		lang(217),
		lang(218),
		lang(219),
		$PROCEDURE,
		$row["name"]
	);
}

page_header(($PROCEDURE != "" ? (isset($_GET["function"]) ? lang(220) : lang(221)) . ": " . h($PROCEDURE) : (isset($_GET["function"]) ? lang(222) : lang(223))), $error);

if (!$_POST) {
	if ($PROCEDURE == "") {
		$row["language"] = "sql";
	} else {
		$row = routine($_GET["procedure"], $routine);
		$row["name"] = $PROCEDURE;
	}
}

$collations = get_vals("SHOW CHARACTER SET");
sort($collations);
$routine_languages = routine_languages();
echo ($collations ? "<datalist id='collations'>" . optionlist($collations) . "</datalist>" : "");
?>

<form action="" method="post" id="form">
<p><?php echo lang(188); ?>: <input name="name" value="<?php echo h($row["name"]); ?>" data-maxlength="64" autocapitalize="off">
<?php echo ($routine_languages ? "<label>" . lang(21) . ": " . html_select("language", $routine_languages, $row["language"]) . "</label>\n" : ""); ?>
<input type="submit" value="<?php echo lang(16); ?>">
<div class="scrollable">
<table class="nowrap">
<?php
edit_fields($row["fields"], $collations, $routine);
if (isset($_GET["function"])) {
	echo "<tr><td>" . lang(224);
	edit_type("returns", (array) $row["returns"], $collations, array(), (JUSH == "pgsql" ? array("void", "trigger") : array()));
}
?>
</table>
<?php echo script("editFields();"); ?>
</div>
<p><?php textarea("definition", $row["definition"], 20); ?>
<p>
<input type="submit" value="<?php echo lang(16); ?>">
<?php if ($PROCEDURE != "") { ?>
<input type="submit" name="drop" value="<?php echo lang(128); ?>"><?php echo confirm(lang(178, $PROCEDURE));  }  echo input_token(); ?>
</form>
<?php
} elseif (isset($_GET["check"])) {
	
$TABLE = $_GET["check"];
$name = $_GET["name"];
$row = $_POST;

if ($row && !$error) {
	if (JUSH == "sqlite") {
		$result = recreate_table($TABLE, $TABLE, array(), array(), array(), "", array(), "$name", ($row["drop"] ? "" : $row["clause"]));
	} else {
		$result = ($name == "" || queries("ALTER TABLE " . table($TABLE) . " DROP CONSTRAINT " . idf_escape($name)));
		if (!$row["drop"]) {
			$result = queries("ALTER TABLE " . table($TABLE) . " ADD" . ($row["name"] != "" ? " CONSTRAINT " . idf_escape($row["name"]) : "") . " CHECK ($row[clause])"); //! SQL injection
		}
	}
	queries_redirect(
		ME . "table=" . urlencode($TABLE),
		($row["drop"] ? lang(225) : ($name != "" ? lang(226) : lang(227))),
		$result
	);
}

page_header(($name != "" ? lang(228) . ": " . h($name) : lang(142)), $error, array("table" => $TABLE));

if (!$row) {
	$checks = driver()->checkConstraints($TABLE);
	$row = array("name" => $name, "clause" => $checks[$name]);
}
?>

<form action="" method="post">
<p><?php
if (JUSH != "sqlite") {
	echo lang(188) . ': <input name="name" value="' . h($row["name"]) . '" data-maxlength="64" autocapitalize="off"> ';
}
echo doc_link(array(
	'sql' => "create-table-check-constraints.html",
	'mariadb' => "constraint/",
	
	
	
), "?");
?>
<p><?php textarea("clause", $row["clause"]); ?>
<p><input type="submit" value="<?php echo lang(16); ?>">
<?php if ($name != "") { ?>
<input type="submit" name="drop" value="<?php echo lang(128); ?>"><?php echo confirm(lang(178, $name));  }  echo input_token(); ?>
</form>
<?php
} elseif (isset($_GET["trigger"])) {
	
$TABLE = $_GET["trigger"];
$name = "$_GET[name]";
$trigger_options = trigger_options();
$row = (array) trigger($name, $TABLE) + array("Trigger" => $TABLE . "_bi");

if ($_POST) {
	if (!$error && in_array($_POST["Timing"], $trigger_options["Timing"]) && in_array($_POST["Event"], $trigger_options["Event"]) && in_array($_POST["Type"], $trigger_options["Type"])) {
		// don't use drop_create() because there may not be more triggers for the same action
		$on = " ON " . table($TABLE);
		$drop = "DROP TRIGGER " . idf_escape($name) . (JUSH == "pgsql" ? $on : "");
		$location = ME . "table=" . urlencode($TABLE);
		if ($_POST["drop"]) {
			query_redirect($drop, $location, lang(229));
		} else {
			if ($name != "") {
				queries($drop);
			}
			queries_redirect(
				$location,
				($name != "" ? lang(230) : lang(231)),
				queries(create_trigger($on, $_POST))
			);
			if ($name != "") {
				queries(create_trigger($on, $row + array("Type" => reset($trigger_options["Type"]))));
			}
		}
	}
	$row = $_POST;
}

page_header(($name != "" ? lang(232) . ": " . h($name) : lang(233)), $error, array("table" => $TABLE));
?>

<form action="" method="post" id="form">
<table class="layout">
<tr><th><?php echo lang(234); ?><td><?php echo html_select("Timing", $trigger_options["Timing"], $row["Timing"], "triggerChange(/^" . preg_quote($TABLE, "/") . "_[ba][iud]$/, '" . js_escape($TABLE) . "', this.form);"); ?>
<tr><th><?php echo lang(235); ?><td><?php echo html_select("Event", $trigger_options["Event"], $row["Event"], "this.form['Timing'].onchange();");  echo (in_array("UPDATE OF", $trigger_options["Event"]) ? " <input name='Of' value='" . h($row["Of"]) . "' class='hidden'>": ""); ?>
<tr><th><?php echo lang(41); ?><td><?php echo html_select("Type", $trigger_options["Type"], $row["Type"]); ?>
</table>
<p><?php echo lang(188); ?>: <input name="Trigger" value="<?php echo h($row["Trigger"]); ?>" data-maxlength="64" autocapitalize="off">
<?php echo script("qs('#form')['Timing'].onchange();"); ?>
<p><?php textarea("Statement", $row["Statement"]); ?>
<p>
<input type="submit" value="<?php echo lang(16); ?>">
<?php if ($name != "") { ?>
<input type="submit" name="drop" value="<?php echo lang(128); ?>"><?php echo confirm(lang(178, $name));  }  echo input_token(); ?>
</form>
<?php
} elseif (isset($_GET["user"])) {
	
$USER = $_GET["user"];
$privileges = array("" => array("All privileges" => ""));
foreach (get_rows("SHOW PRIVILEGES") as $row) {
	foreach (explode(",", ($row["Privilege"] == "Grant option" ? "" : $row["Context"])) as $context) {
		$privileges[$context][$row["Privilege"]] = $row["Comment"];
	}
}
$privileges["Server Admin"] += $privileges["File access on server"];
$privileges["Databases"]["Create routine"] = $privileges["Procedures"]["Create routine"]; // MySQL bug #30305
unset($privileges["Procedures"]["Create routine"]);
$privileges["Columns"] = array();
foreach (array("Select", "Insert", "Update", "References") as $val) {
	$privileges["Columns"][$val] = $privileges["Tables"][$val];
}
unset($privileges["Server Admin"]["Usage"]);
foreach ($privileges["Tables"] as $key => $val) {
	unset($privileges["Databases"][$key]);
}

$new_grants = array();
if ($_POST) {
	foreach ($_POST["objects"] as $key => $val) {
		$new_grants[$val] = (array) $new_grants[$val] + idx($_POST["grants"], $key, array());
	}
}
$grants = array();
$old_pass = "";

if (isset($_GET["host"]) && ($result = connection()->query("SHOW GRANTS FOR " . q($USER) . "@" . q($_GET["host"])))) { //! use information_schema for MySQL 5 - column names in column privileges are not escaped
	while ($row = $result->fetch_row()) {
		if (preg_match('~GRANT (.*) ON (.*) TO ~', $row[0], $match) && preg_match_all('~ *([^(,]*[^ ,(])( *\([^)]+\))?~', $match[1], $matches, PREG_SET_ORDER)) { //! escape the part between ON and TO
			foreach ($matches as $val) {
				if ($val[1] != "USAGE") {
					$grants["$match[2]$val[2]"][$val[1]] = true;
				}
				if (preg_match('~ WITH GRANT OPTION~', $row[0])) { //! don't check inside strings and identifiers
					$grants["$match[2]$val[2]"]["GRANT OPTION"] = true;
				}
			}
		}
		if (preg_match("~ IDENTIFIED BY PASSWORD '([^']+)~", $row[0], $match)) {
			$old_pass = $match[1];
		}
	}
}

if ($_POST && !$error) {
	$old_user = (isset($_GET["host"]) ? q($USER) . "@" . q($_GET["host"]) : "''");
	if ($_POST["drop"]) {
		query_redirect("DROP USER $old_user", ME . "privileges=", lang(236));
	} else {
		$new_user = q($_POST["user"]) . "@" . q($_POST["host"]); // if $_GET["host"] is not set then $new_user is always different
		$pass = $_POST["pass"];
		if ($pass != '' && !$_POST["hashed"] && !min_version(8)) {
			// compute hash in a separate query so that plain text password is not saved to history
			$pass = get_val("SELECT PASSWORD(" . q($pass) . ")");
			$error = !$pass;
		}

		$created = false;
		if (!$error) {
			if ($old_user != $new_user) {
				$created = queries((min_version(5) ? "CREATE USER" : "GRANT USAGE ON *.* TO") . " $new_user IDENTIFIED BY " . (min_version(8) ? "" : "PASSWORD ") . q($pass));
				$error = !$created;
			} elseif ($pass != $old_pass) {
				queries("SET PASSWORD FOR $new_user = " . q($pass));
			}
		}

		if (!$error) {
			$revoke = array();
			foreach ($new_grants as $object => $grant) {
				if (isset($_GET["grant"])) {
					$grant = array_filter($grant);
				}
				$grant = array_keys($grant);
				if (isset($_GET["grant"])) {
					// no rights to mysql.user table
					$revoke = array_diff(array_keys(array_filter($new_grants[$object], 'strlen')), $grant);
				} elseif ($old_user == $new_user) {
					$old_grant = array_keys((array) $grants[$object]);
					$revoke = array_diff($old_grant, $grant);
					$grant = array_diff($grant, $old_grant);
					unset($grants[$object]);
				}
				if (
					preg_match('~^(.+)\s*(\(.*\))?$~U', $object, $match) && (
					!grant("REVOKE", $revoke, $match[2], " ON $match[1] FROM $new_user") //! SQL injection
					|| !grant("GRANT", $grant, $match[2], " ON $match[1] TO $new_user"))
				) {
					$error = true;
					break;
				}
			}
		}

		if (!$error && isset($_GET["host"])) {
			if ($old_user != $new_user) {
				queries("DROP USER $old_user");
			} elseif (!isset($_GET["grant"])) {
				foreach ($grants as $object => $revoke) {
					if (preg_match('~^(.+)(\(.*\))?$~U', $object, $match)) {
						grant("REVOKE", array_keys($revoke), $match[2], " ON $match[1] FROM $new_user");
					}
				}
			}
		}

		queries_redirect(ME . "privileges=", (isset($_GET["host"]) ? lang(237) : lang(238)), !$error);

		if ($created) {
			// delete new user in case of an error
			connection()->query("DROP USER $new_user");
		}
	}
}

page_header((isset($_GET["host"]) ? lang(27) . ": " . h("$USER@$_GET[host]") : lang(150)), $error, array("privileges" => array('', lang(63))));

$row = $_POST;
if ($row) {
	$grants = $new_grants;
} else {
	$row = $_GET + array("host" => get_val("SELECT SUBSTRING_INDEX(CURRENT_USER, '@', -1)")); // create user on the same domain by default
	$row["pass"] = $old_pass;
	if ($old_pass != "") {
		$row["hashed"] = true;
	}
	$grants[(DB == "" || $grants ? "" : idf_escape(addcslashes(DB, "%_\\"))) . ".*"] = array();
}

?>
<form action="" method="post">
<table class="layout">
<tr><th><?php echo lang(25); ?><td><input name="host" data-maxlength="60" value="<?php echo h($row["host"]); ?>" autocapitalize="off">
<tr><th><?php echo lang(27); ?><td><input name="user" data-maxlength="80" value="<?php echo h($row["user"]); ?>" autocapitalize="off">
<tr><th><?php echo lang(28); ?><td><input name="pass" id="pass" value="<?php echo h($row["pass"]); ?>" autocomplete="new-password">
<?php echo ($row["hashed"] ? "" : script("typePassword(qs('#pass'));"));  echo (min_version(8) ? "" : checkbox("hashed", 1, $row["hashed"], lang(239), "typePassword(this.form['pass'], this.checked);")); ?>
</table>

<?php
//! MAX_* limits, REQUIRE
echo "<table class='odds'>\n";
echo "<thead><tr><th colspan='2'>" . lang(63) . doc_link(array('sql' => "grant.html#priv_level"));
$i = 0;
foreach ($grants as $object => $grant) {
	echo '<th>' . ($object != "*.*"
		? "<input name='objects[$i]' value='" . h($object) . "' size='10' autocapitalize='off'>"
		: input_hidden("objects[$i]", "*.*") . "*.*"
	); //! separate db, table, columns, PROCEDURE|FUNCTION, routine
	$i++;
}
echo "</thead>\n";

foreach (
	array(
		"" => "",
		"Server Admin" => lang(25),
		"Databases" => lang(29),
		"Tables" => lang(133),
		"Columns" => lang(40),
		"Procedures" => lang(240),
	) as $context => $desc
) {
	foreach ((array) $privileges[$context] as $privilege => $comment) {
		echo "<tr><td" . ($desc ? ">$desc<td" : " colspan='2'") . ' lang="en" title="' . h($comment) . '">' . h($privilege);
		$i = 0;
		foreach ($grants as $object => $grant) {
			$name = "'grants[$i][" . h(strtoupper($privilege)) . "]'";
			$value = $grant[strtoupper($privilege)];
			if ($context == "Server Admin" && $object != (isset($grants["*.*"]) ? "*.*" : ".*")) {
				echo "<td>";
			} elseif (isset($_GET["grant"])) {
				echo "<td><select name=$name><option><option value='1'" . ($value ? " selected" : "") . ">" . lang(241) . "<option value='0'" . ($value == "0" ? " selected" : "") . ">" . lang(242) . "</select>";
			} else {
				echo "<td align='center'><label class='block'>";
				echo "<input type='checkbox' name=$name value='1'" . ($value ? " checked" : "") . ($privilege == "All privileges"
					? " id='grants-$i-all'>" //! uncheck all except grant if all is checked
					: ">" . ($privilege == "Grant option" ? "" : script("qsl('input').onclick = function () { if (this.checked) formUncheck('grants-$i-all'); };")));
				echo "</label>";
			}
			$i++;
		}
	}
}

echo "</table>\n";
?>
<p>
<input type="submit" value="<?php echo lang(16); ?>">
<?php if (isset($_GET["host"])) { ?>
<input type="submit" name="drop" value="<?php echo lang(128); ?>"><?php echo confirm(lang(178, "$USER@$_GET[host]"));  }  echo input_token(); ?>
</form>
<?php
} elseif (isset($_GET["processlist"])) {
	
if (support("kill")) {
	if ($_POST && !$error) {
		$killed = 0;
		foreach ((array) $_POST["kill"] as $val) {
			if (adminer()->killProcess($val)) {
				$killed++;
			}
		}
		queries_redirect(ME . "processlist=", lang(243, $killed), $killed || !$_POST["kill"]);
	}
}

page_header(lang(117), $error);
?>

<form action="" method="post">
<div class="scrollable">
<table class="nowrap checkable odds">
<?php
echo script("mixin(qsl('table'), {onclick: tableClick, ondblclick: partialArg(tableClick, true)});");
// HTML valid because there is always at least one process
$i = -1;
foreach (adminer()->processList() as $i => $row) {
	if (!$i) {
		echo "<thead><tr lang='en'>" . (support("kill") ? "<th>" : "");
		foreach ($row as $key => $val) {
			echo "<th>$key" . doc_link(array(
				'sql' => "show-processlist.html#processlist_" . strtolower($key),
				
				
			));
		}
		echo "</thead>\n";
	}
	echo "<tr>" . (support("kill") ? "<td>" . checkbox("kill[]", $row[JUSH == "sql" ? "Id" : "pid"], 0) : "");
	foreach ($row as $key => $val) {
		echo "<td>" . (
			(JUSH == "sql" && $key == "Info" && preg_match("~Query|Killed~", $row["Command"]) && $val != "") ||
			(JUSH == "pgsql" && $key == "current_query" && $val != "<IDLE>") ||
			(JUSH == "oracle" && $key == "sql_text" && $val != "")
			? "<code class='jush-" . JUSH . "'>" . shorten_utf8($val, 100, "</code>") . ' <a href="' . h(ME . ($row["db"] != "" ? "db=" . urlencode($row["db"]) . "&" : "") . "sql=" . urlencode($val)) . '">' . lang(244) . '</a>'
			: h($val)
		);
	}
	echo "\n";
}
?>
</table>
</div>
<p>
<?php
if (support("kill")) {
	echo ($i + 1) . "/" . lang(245, max_connections());
	echo "<p><input type='submit' value='" . lang(246) . "'>\n";
}
echo input_token();
?>
</form>
<?php echo script("tableCheck();"); 
} elseif (isset($_GET["select"])) {
	
$TABLE = $_GET["select"];
$table_status = table_status1($TABLE);
$indexes = indexes($TABLE);
$fields = fields($TABLE);
$foreign_keys = column_foreign_keys($TABLE);
$oid = $table_status["Oid"];
$adminer_import = get_settings("adminer_import");

$rights = array(); // privilege => 0
$columns = array(); // selectable columns
$search_columns = array(); // searchable columns
$order_columns = array(); // searchable columns
$text_length = "";
foreach ($fields as $key => $field) {
	$name = adminer()->fieldName($field);
	$name_plain = html_entity_decode(strip_tags($name), ENT_QUOTES);
	if (isset($field["privileges"]["select"]) && $name != "") {
		$columns[$key] = $name_plain;
		if (is_shortable($field)) {
			$text_length = adminer()->selectLengthProcess();
		}
	}
	if (isset($field["privileges"]["where"]) && $name != "") {
		$search_columns[$key] = $name_plain;
	}
	if (isset($field["privileges"]["order"]) && $name != "") {
		$order_columns[$key] = $name_plain;
	}
	$rights += $field["privileges"];
}

list($select, $group) = adminer()->selectColumnsProcess($columns, $indexes);
$select = array_unique($select);
$group = array_unique($group);
$is_group = count($group) < count($select);
$where = adminer()->selectSearchProcess($fields, $indexes);
$order = adminer()->selectOrderProcess($fields, $indexes);
$limit = adminer()->selectLimitProcess();

if ($_GET["val"] && is_ajax()) {
	header("Content-Type: text/plain; charset=utf-8");
	foreach ($_GET["val"] as $unique_idf => $row) {
		$as = convert_field($fields[key($row)]);
		$select = array($as ?: idf_escape(key($row)));
		$where[] = where_check($unique_idf, $fields);
		$return = driver()->select($TABLE, $select, $where, $select);
		if ($return) {
			echo first($return->fetch_row());
		}
	}
	exit;
}

$primary = $unselected = array();
foreach ($indexes as $index) {
	if ($index["type"] == "PRIMARY") {
		$primary = array_flip($index["columns"]);
		$unselected = ($select ? $primary : array());
		foreach ($unselected as $key => $val) {
			if (in_array(idf_escape($key), $select)) {
				unset($unselected[$key]);
			}
		}
		break;
	}
}
if ($oid && !$primary) {
	$primary = $unselected = array($oid => 0);
	$indexes[] = array("type" => "PRIMARY", "columns" => array($oid));
}

if ($_POST && !$error) {
	$where_check = $where;
	if (!$_POST["all"] && is_array($_POST["check"])) {
		$checks = array();
		foreach ($_POST["check"] as $check) {
			$checks[] = where_check($check, $fields);
		}
		$where_check[] = "((" . implode(") OR (", $checks) . "))";
	}
	$where_check = ($where_check ? "\nWHERE " . implode(" AND ", $where_check) : "");
	if ($_POST["export"]) {
		save_settings(array("output" => $_POST["output"], "format" => $_POST["format"]), "adminer_import");
		dump_headers($TABLE);
		adminer()->dumpTable($TABLE, "");
		$from = ($select ? implode(", ", $select) : "*")
			. convert_fields($columns, $fields, $select)
			. "\nFROM " . table($TABLE);
		$group_by = ($group && $is_group ? "\nGROUP BY " . implode(", ", $group) : "") . ($order ? "\nORDER BY " . implode(", ", $order) : "");
		$query = "SELECT $from$where_check$group_by";
		if (is_array($_POST["check"]) && !$primary) {
			$union = array();
			foreach ($_POST["check"] as $val) {
				// where is not unique so OR can't be used
				$union[] = "(SELECT" . limit($from, "\nWHERE " . ($where ? implode(" AND ", $where) . " AND " : "") . where_check($val, $fields) . $group_by, 1) . ")";
			}
			$query = implode(" UNION ALL ", $union);
		}
		adminer()->dumpData($TABLE, "table", $query);
		adminer()->dumpFooter();
		exit;
	}

	if (!adminer()->selectEmailProcess($where, $foreign_keys)) {
		if ($_POST["save"] || $_POST["delete"]) { // edit
			$result = true;
			$affected = 0;
			$set = array();
			if (!$_POST["delete"]) {
				foreach ($_POST["fields"] as $name => $val) {
					$val = process_input($fields[$name]);
					if ($val !== null && ($_POST["clone"] || $val !== false)) {
						$set[idf_escape($name)] = ($val !== false ? $val : idf_escape($name));
					}
				}
			}
			if ($_POST["delete"] || $set) {
				$query = ($_POST["clone"] ? "INTO " . table($TABLE) . " (" . implode(", ", array_keys($set)) . ")\nSELECT " . implode(", ", $set) . "\nFROM " . table($TABLE) : "");
				if ($_POST["all"] || ($primary && is_array($_POST["check"])) || $is_group) {
					$result = ($_POST["delete"]
						? driver()->delete($TABLE, $where_check)
						: ($_POST["clone"]
							? queries("INSERT $query$where_check" . driver()->insertReturning($TABLE))
							: driver()->update($TABLE, $set, $where_check)
						)
					);
					$affected = connection()->affected_rows;
					if (is_object($result)) { // PostgreSQL with RETURNING fills num_rows
						$affected += $result->num_rows;
					}
				} else {
					foreach ((array) $_POST["check"] as $val) {
						// where is not unique so OR can't be used
						$where2 = "\nWHERE " . ($where ? implode(" AND ", $where) . " AND " : "") . where_check($val, $fields);
						$result = ($_POST["delete"]
							? driver()->delete($TABLE, $where2, 1)
							: ($_POST["clone"]
								? queries("INSERT" . limit1($TABLE, $query, $where2))
								: driver()->update($TABLE, $set, $where2, 1)
							)
						);
						if (!$result) {
							break;
						}
						$affected += connection()->affected_rows;
					}
				}
			}
			$message = lang(247, $affected);
			if ($_POST["clone"] && $result && $affected == 1) {
				$last_id = last_id($result);
				if ($last_id) {
					$message = lang(171, " $last_id");
				}
			}
			queries_redirect(remove_from_uri($_POST["all"] && $_POST["delete"] ? "page" : ""), $message, $result);
			if (!$_POST["delete"]) {
				$post_fields = (array) $_POST["fields"];
				edit_form($TABLE, array_intersect_key($fields, $post_fields), $post_fields, !$_POST["clone"], $error);
				page_footer();
				exit;
			}

		} elseif (!$_POST["import"]) { // modify
			if (!$_POST["val"]) {
				$error = lang(248);
			} else {
				$result = true;
				$affected = 0;
				foreach ($_POST["val"] as $unique_idf => $row) {
					$set = array();
					foreach ($row as $key => $val) {
						$key = bracket_escape($key, true); // true - back
						$set[idf_escape($key)] = (preg_match('~char|text~', $fields[$key]["type"]) || $val != "" ? adminer()->processInput($fields[$key], $val) : "NULL");
					}
					$result = driver()->update(
						$TABLE,
						$set,
						" WHERE " . ($where ? implode(" AND ", $where) . " AND " : "") . where_check($unique_idf, $fields),
						($is_group || $primary ? 0 : 1),
						" "
					);
					if (!$result) {
						break;
					}
					$affected += connection()->affected_rows;
				}
				queries_redirect(remove_from_uri(), lang(247, $affected), $result);
			}

		} elseif (!is_string($file = get_file("csv_file", true))) {
			$error = upload_error($file);
		} elseif (!preg_match('~~u', $file)) {
			$error = lang(249);
		} else {
			save_settings(array("output" => $adminer_import["output"], "format" => $_POST["separator"]), "adminer_import");
			$result = true;
			$cols = array_keys($fields);
			preg_match_all('~(?>"[^"]*"|[^"\r\n]+)+~', $file, $matches);
			$affected = count($matches[0]);
			driver()->begin();
			$separator = ($_POST["separator"] == "csv" ? "," : ($_POST["separator"] == "tsv" ? "\t" : ";"));
			$rows = array();
			foreach ($matches[0] as $key => $val) {
				preg_match_all("~((?>\"[^\"]*\")+|[^$separator]*)$separator~", $val . $separator, $matches2);
				if (!$key && !array_diff($matches2[1], $cols)) { //! doesn't work with column names containing ",\n
					// first row corresponds to column names - use it for table structure
					$cols = $matches2[1];
					$affected--;
				} else {
					$set = array();
					foreach ($matches2[1] as $i => $col) {
						$set[idf_escape($cols[$i])] = ($col == "" && $fields[$cols[$i]]["null"] ? "NULL" : q(preg_match('~^".*"$~s', $col) ? str_replace('""', '"', substr($col, 1, -1)) : $col));
					}
					$rows[] = $set;
				}
			}
			$result = (!$rows || driver()->insertUpdate($TABLE, $rows, $primary));
			if ($result) {
				driver()->commit();
			}
			queries_redirect(remove_from_uri("page"), lang(250, $affected), $result);
			driver()->rollback(); // after queries_redirect() to not overwrite error

		}
	}
}

$table_name = adminer()->tableName($table_status);
if (is_ajax()) {
	page_headers();
	ob_start();
} else {
	page_header(lang(45) . ": $table_name", $error);
}

$set = null;
if (isset($rights["insert"]) || !support("table")) {
	$params = array();
	foreach ((array) $_GET["where"] as $val) {
		if (
			isset($foreign_keys[$val["col"]]) && count($foreign_keys[$val["col"]]) == 1
			&& ($val["op"] == "=" || (!$val["op"] && (is_array($val["val"]) || !preg_match('~[_%]~', $val["val"])))) // LIKE in Editor
		) {
			$params["set" . "[" . bracket_escape($val["col"]) . "]"] = $val["val"];
		}
	}

	$set = $params ? "&" . http_build_query($params) : "";
}
adminer()->selectLinks($table_status, $set);

if (!$columns && support("table")) {
	echo "<p class='error'>" . lang(251) . ($fields ? "." : ": " . error()) . "\n";
} else {
	echo "<form action='' id='form'>\n";
	echo "<div style='display: none;'>";
	hidden_fields_get();
	echo (DB != "" ? input_hidden("db", DB) . (isset($_GET["ns"]) ? input_hidden("ns", $_GET["ns"]) : "") : ""); // not used in Editor
	echo input_hidden("select", $TABLE);
	echo "</div>\n";
	adminer()->selectColumnsPrint($select, $columns);
	adminer()->selectSearchPrint($where, $search_columns, $indexes);
	adminer()->selectOrderPrint($order, $order_columns, $indexes);
	adminer()->selectLimitPrint($limit);
	adminer()->selectLengthPrint($text_length);
	adminer()->selectActionPrint($indexes);
	echo "</form>\n";

	$page = $_GET["page"];
	$found_rows = null;
	if ($page == "last") {
		$found_rows = get_val(count_rows($TABLE, $where, $is_group, $group));
		$page = floor(max(0, intval($found_rows) - 1) / $limit);
	}

	$select2 = $select;
	$group2 = $group;
	if (!$select2) {
		$select2[] = "*";
		$convert_fields = convert_fields($columns, $fields, $select);
		if ($convert_fields) {
			$select2[] = substr($convert_fields, 2);
		}
	}
	foreach ($select as $key => $val) {
		$field = $fields[idf_unescape($val)];
		if ($field && ($as = convert_field($field))) {
			$select2[$key] = "$as AS $val";
		}
	}
	if (!$is_group && $unselected) {
		foreach ($unselected as $key => $val) {
			$select2[] = idf_escape($key);
			if ($group2) {
				$group2[] = idf_escape($key);
			}
		}
	}
	$result = driver()->select($TABLE, $select2, $where, $group2, $order, $limit, $page, true);

	if (!$result) {
		echo "<p class='error'>" . error() . "\n";
	} else {
		if (JUSH == "mssql" && $page) {
			$result->seek($limit * $page);
		}
		$email_fields = array();
		echo "<form action='' method='post' enctype='multipart/form-data'>\n";
		$rows = array();
		while ($row = $result->fetch_assoc()) {
			if ($page && JUSH == "oracle") {
				unset($row["RNUM"]);
			}
			$rows[] = $row;
		}

		// use count($rows) without LIMIT, COUNT(*) without grouping, FOUND_ROWS otherwise (slowest)
		if ($_GET["page"] != "last" && $limit && $group && $is_group && JUSH == "sql") {
			$found_rows = get_val(" SELECT FOUND_ROWS()"); // space to allow mysql.trace_mode
		}

		if (!$rows) {
			echo "<p class='message'>" . lang(14) . "\n";
		} else {
			$backward_keys = adminer()->backwardKeys($TABLE, $table_name);

			echo "<div class='scrollable'>";
			echo "<table id='table' class='nowrap checkable odds'>";
			echo script("mixin(qs('#table'), {onclick: tableClick, ondblclick: partialArg(tableClick, true), onkeydown: editingKeydown});");
			echo "<thead><tr>" . (!$group && $select
				? ""
				: "<td><input type='checkbox' id='all-page' class='jsonly'>" . script("qs('#all-page').onclick = partial(formCheck, /check/);", "")
					. " <a href='" . h($_GET["modify"] ? remove_from_uri("modify") : $_SERVER["REQUEST_URI"] . "&modify=1") . "'>" . lang(252) . "</a>");
			$names = array();
			$functions = array();
			reset($select);
			$rank = 1;
			foreach ($rows[0] as $key => $val) {
				if (!isset($unselected[$key])) {
					/** @var array{fun?:string, col?:string} */
					$val = idx($_GET["columns"], key($select)) ?: array();
					$field = $fields[$select ? ($val ? $val["col"] : current($select)) : $key];
					$name = ($field ? adminer()->fieldName($field, $rank) : ($val["fun"] ? "*" : h($key)));
					if ($name != "") {
						$rank++;
						$names[$key] = $name;
						$column = idf_escape($key);
						$href = remove_from_uri('(order|desc)[^=]*|page') . '&order%5B0%5D=' . urlencode($key);
						$desc = "&desc%5B0%5D=1";
						echo "<th id='th[" . h(bracket_escape($key)) . "]'>" . script("mixin(qsl('th'), {onmouseover: partial(columnMouse), onmouseout: partial(columnMouse, ' hidden')});", "");
						$fun = apply_sql_function($val["fun"], $name); //! columns looking like functions
						$sortable = isset($field["privileges"]["order"]) || $fun != $name;
						echo ($sortable ? "<a href='" . h($href . ($order[0] == $column || $order[0] == $key ? $desc : '')) . "'>$fun</a>" : $fun); // $order[0] == $key - COUNT(*)
						$menu = ($sortable ? "<a href='" . h($href . $desc) . "' title='" . lang(51) . "' class='text'> ↓</a>" : '');
						if (!$val["fun"] && isset($field["privileges"]["where"])) {
							$menu .= '<a href="#fieldset-search" title="' . lang(48) . '" class="text jsonly"> =</a>';
							$menu .= script("qsl('a').onclick = partial(selectSearch, '" . js_escape($key) . "');");
						}
						echo ($menu ? "<span class='column hidden'>$menu</span>" : "");
					}
					$functions[$key] = $val["fun"];
					next($select);
				}
			}

			$lengths = array();
			if ($_GET["modify"]) {
				foreach ($rows as $row) {
					foreach ($row as $key => $val) {
						$lengths[$key] = max($lengths[$key], min(40, strlen(utf8_decode($val))));
					}
				}
			}

			echo ($backward_keys ? "<th>" . lang(253) : "") . "</thead>\n";

			if (is_ajax()) {
				ob_end_clean();
			}

			foreach (adminer()->rowDescriptions($rows, $foreign_keys) as $n => $row) {
				$unique_array = unique_array($rows[$n], $indexes);
				if (!$unique_array) {
					$unique_array = array();
					reset($select);
					foreach ($rows[$n] as $key => $val) {
						if (!preg_match('~^(COUNT|AVG|GROUP_CONCAT|MAX|MIN|SUM)\(~', current($select))) {
							$unique_array[$key] = $val;
						}
						next($select);
					}
				}
				$unique_idf = "";
				foreach ($unique_array as $key => $val) {
					$field = (array) $fields[$key];
					if ((JUSH == "sql" || JUSH == "pgsql") && preg_match('~char|text|enum|set~', $field["type"]) && strlen($val) > 64) {
						$key = (strpos($key, '(') ? $key : idf_escape($key)); //! columns looking like functions
						$key = "MD5(" . (JUSH != 'sql' || preg_match("~^utf8~", $field["collation"]) ? $key : "CONVERT($key USING " . charset(connection()) . ")") . ")";
						$val = md5($val);
					}
					$unique_idf .= "&" . ($val !== null ? urlencode("where[" . bracket_escape($key) . "]") . "=" . urlencode($val === false ? "f" : $val) : "null%5B%5D=" . urlencode($key));
				}
				echo "<tr>" . (!$group && $select ? "" : "<td>"
					. checkbox("check[]", substr($unique_idf, 1), in_array(substr($unique_idf, 1), (array) $_POST["check"]))
					. ($is_group || information_schema(DB) ? "" : " <a href='" . h(ME . "edit=" . urlencode($TABLE) . $unique_idf) . "' class='edit'>" . lang(254) . "</a>")
				);

				reset($select);
				foreach ($row as $key => $val) {
					if (isset($names[$key])) {
						$column = current($select);
						$field = (array) $fields[$key];
						if ($val != "" && (!isset($email_fields[$key]) || $email_fields[$key] != "")) {
							$email_fields[$key] = (is_mail($val) ? $names[$key] : ""); //! filled e-mails can be contained on other pages
						}

						$link = "";
						if (is_blob($field) && $val != "") {
							$link = ME . 'download=' . urlencode($TABLE) . '&field=' . urlencode($key) . $unique_idf;
						}
						if (!$link && $val !== null) { // link related items
							foreach ((array) $foreign_keys[$key] as $foreign_key) {
								if (count($foreign_keys[$key]) == 1 || end($foreign_key["source"]) == $key) {
									$link = "";
									foreach ($foreign_key["source"] as $i => $source) {
										$link .= where_link($i, $foreign_key["target"][$i], $rows[$n][$source]);
									}
									$link = ($foreign_key["db"] != "" ? preg_replace('~([?&]db=)[^&]+~', '\1' . urlencode($foreign_key["db"]), ME) : ME) . 'select=' . urlencode($foreign_key["table"]) . $link; // InnoDB supports non-UNIQUE keys
									if ($foreign_key["ns"]) {
										$link = preg_replace('~([?&]ns=)[^&]+~', '\1' . urlencode($foreign_key["ns"]), $link);
									}
									if (count($foreign_key["source"]) == 1) {
										break;
									}
								}
							}
						}
						if ($column == "COUNT(*)") {
							$link = ME . "select=" . urlencode($TABLE);
							$i = 0;
							foreach ((array) $_GET["where"] as $v) {
								if (!array_key_exists($v["col"], $unique_array)) {
									$link .= where_link($i++, $v["col"], $v["val"], $v["op"]);
								}
							}
							foreach ($unique_array as $k => $v) {
								$link .= where_link($i++, $k, $v);
							}
						}

						$html = select_value($val, $link, $field, $text_length);
						$id = h("val[$unique_idf][" . bracket_escape($key) . "]");
						$posted = idx(idx($_POST["val"], $unique_idf), bracket_escape($key));
						$editable = !is_array($row[$key]) && is_utf8($html) && $rows[$n][$key] == $row[$key] && !$functions[$key] && !$field["generated"];
						$type = (preg_match('~^(AVG|MIN|MAX)\((.+)\)~', $column, $match) ? $fields[idf_unescape($match[2])]["type"] : $field["type"]);
						$text = preg_match('~text|json|lob~', $type);
						$is_number = preg_match(number_type(), $type) || preg_match('~^(CHAR_LENGTH|ROUND|FLOOR|CEIL|TIME_TO_SEC|COUNT|SUM)\(~', $column);
						echo "<td id='$id'" . ($is_number && ($val === null || is_numeric(strip_tags($html)) || $type == "money") ? " class='number'" : "");
						if (($_GET["modify"] && $editable && $val !== null) || $posted !== null) {
							$h_value = h($posted !== null ? $posted : $row[$key]);
							echo ">" . ($text ? "<textarea name='$id' cols='30' rows='" . (substr_count($row[$key], "\n") + 1) . "'>$h_value</textarea>" : "<input name='$id' value='$h_value' size='$lengths[$key]'>");
						} else {
							$long = strpos($html, "<i>…</i>");
							echo " data-text='" . ($long ? 2 : ($text ? 1 : 0)) . "'"
								. ($editable ? "" : " data-warning='" . h(lang(255)) . "'")
								. ">$html"
							;
						}
					}
					next($select);
				}

				if ($backward_keys) {
					echo "<td>";
				}
				adminer()->backwardKeysPrint($backward_keys, $rows[$n]);
				echo "</tr>\n"; // close to allow white-space: pre
			}

			if (is_ajax()) {
				exit;
			}
			echo "</table>\n";
			echo "</div>\n";
		}

		if (!is_ajax()) {
			if ($rows || $page) {
				$exact_count = true;
				if ($_GET["page"] != "last") {
					if (!$limit || (count($rows) < $limit && ($rows || !$page))) {
						$found_rows = ($page ? $page * $limit : 0) + count($rows);
					} elseif (JUSH != "sql" || !$is_group) {
						$found_rows = ($is_group ? false : found_rows($table_status, $where));
						if (intval($found_rows) < max(1e4, 2 * ($page + 1) * $limit)) {
							// slow with big tables
							$found_rows = first(slow_query(count_rows($TABLE, $where, $is_group, $group)));
						} elseif (JUSH == 'sql' || JUSH == 'pgsql') {
							$exact_count = false;
						}
					}
				}

				$pagination = ($limit && ($found_rows === false || $found_rows > $limit || $page));
				if ($pagination) {
					echo (($found_rows === false ? count($rows) + 1 : $found_rows - $page * $limit) > $limit
						? '<p><a href="' . h(remove_from_uri("page") . "&page=" . ($page + 1)) . '" class="loadmore">' . lang(256) . '</a>'
							. script("qsl('a').onclick = partial(selectLoadMore, $limit, '" . lang(257) . "…');", "")
						: ''
					);
					echo "\n";
				}

				echo "<div class='footer'><div>\n";
				if ($pagination) {
					// display first, previous 4, next 4 and last page
					$max_page = ($found_rows === false
						? $page + (count($rows) >= $limit ? 2 : 1)
						: floor(($found_rows - 1) / $limit)
					);
					echo "<fieldset>";
					if (JUSH != "simpledb") {
						echo "<legend><a href='" . h(remove_from_uri("page")) . "'>" . lang(258) . "</a></legend>";
						echo script("qsl('a').onclick = function () { pageClick(this.href, +prompt('" . lang(258) . "', '" . ($page + 1) . "')); return false; };");
						echo pagination(0, $page) . ($page > 5 ? " …" : "");
						for ($i = max(1, $page - 4); $i < min($max_page, $page + 5); $i++) {
							echo pagination($i, $page);
						}
						if ($max_page > 0) {
							echo ($page + 5 < $max_page ? " …" : "");
							echo ($exact_count && $found_rows !== false
								? pagination($max_page, $page)
								: " <a href='" . h(remove_from_uri("page") . "&page=last") . "' title='~$max_page'>" . lang(259) . "</a>"
							);
						}
					} else {
						echo "<legend>" . lang(258) . "</legend>";
						echo pagination(0, $page) . ($page > 1 ? " …" : "");
						echo ($page ? pagination($page, $page) : "");
						echo ($max_page > $page ? pagination($page + 1, $page) . ($max_page > $page + 1 ? " …" : "") : "");
					}
					echo "</fieldset>\n";
				}

				echo "<fieldset>";
				echo "<legend>" . lang(260) . "</legend>";
				$display_rows = ($exact_count ? "" : "~ ") . $found_rows;
				$onclick = "const checked = formChecked(this, /check/); selectCount('selected', this.checked ? '$display_rows' : checked); selectCount('selected2', this.checked || !checked ? '$display_rows' : checked);";
				echo checkbox("all", 1, 0, ($found_rows !== false ? ($exact_count ? "" : "~ ") . lang(154, $found_rows) : ""), $onclick) . "\n";
				echo "</fieldset>\n";

				if (adminer()->selectCommandPrint()) {
					?>
<fieldset<?php echo ($_GET["modify"] ? '' : ' class="jsonly"'); ?>><legend><?php echo lang(252); ?></legend><div>
<input type="submit" value="<?php echo lang(16); ?>"<?php echo ($_GET["modify"] ? '' : ' title="' . lang(248) . '"'); ?>>
</div></fieldset>
<fieldset><legend><?php echo lang(127); ?> <span id="selected"></span></legend><div>
<input type="submit" name="edit" value="<?php echo lang(12); ?>">
<input type="submit" name="clone" value="<?php echo lang(244); ?>">
<input type="submit" name="delete" value="<?php echo lang(20); ?>"><?php echo confirm(); ?>
</div></fieldset>
<?php
				}

				$format = adminer()->dumpFormat();
				foreach ((array) $_GET["columns"] as $column) {
					if ($column["fun"]) {
						unset($format['sql']);
						break;
					}
				}
				if ($format) {
					print_fieldset("export", lang(68) . " <span id='selected2'></span>");
					$output = adminer()->dumpOutput();
					echo ($output ? html_select("output", $output, $adminer_import["output"]) . " " : "");
					echo html_select("format", $format, $adminer_import["format"]);
					echo " <input type='submit' name='export' value='" . lang(68) . "'>\n";
					echo "</div></fieldset>\n";
				}

				adminer()->selectEmailPrint(array_filter($email_fields, 'strlen'), $columns);
				echo "</div></div>\n";
			}

			if (adminer()->selectImportPrint()) {
				echo "<p>";
				echo "<a href='#import'>" . lang(67) . "</a>";
				echo script("qsl('a').onclick = partial(toggle, 'import');", "");
				echo "<span id='import'" . ($_POST["import"] ? "" : " class='hidden'") . ">: ";
				echo file_input("<input type='file' name='csv_file'> "
					. html_select("separator", array("csv" => "CSV,", "csv;" => "CSV;", "tsv" => "TSV"), $adminer_import["format"])
					. " <input type='submit' name='import' value='" . lang(67) . "'>")
				;
				echo "</span>";
			}

			echo input_token();
			echo "</form>\n";
			echo (!$group && $select ? "" : script("tableCheck();"));
		}
	}
}

if (is_ajax()) {
	ob_end_clean();
	exit;
}

} elseif (isset($_GET["variables"])) {
	
$status = isset($_GET["status"]);
page_header($status ? lang(119) : lang(118));

$variables = ($status ? adminer()->showStatus() : adminer()->showVariables());
if (!$variables) {
	echo "<p class='message'>" . lang(14) . "\n";
} else {
	echo "<table>\n";
	foreach ($variables as $row) {
		echo "<tr>";
		$key = array_shift($row);
		echo "<th><code class='jush-" . JUSH . ($status ? "status" : "set") . "'>" . h($key) . "</code>";
		foreach ($row as $val) {
			echo "<td>" . nl_br(h($val));
		}
	}
	echo "</table>\n";
}

} elseif (isset($_GET["script"])) {
	
header("Content-Type: text/javascript; charset=utf-8");

if ($_GET["script"] == "db") {
	$sums = array("Data_length" => 0, "Index_length" => 0, "Data_free" => 0);
	foreach (table_status() as $name => $table_status) {
		json_row("Comment-$name", h($table_status["Comment"]));
		if (!is_view($table_status) || preg_match('~materialized~i', $table_status["Engine"])) {
			foreach (array("Engine", "Collation") as $key) {
				json_row("$key-$name", h($table_status[$key]));
			}
			foreach ($sums + array("Auto_increment" => 0, "Rows" => 0) as $key => $val) {
				if ($table_status[$key] != "") {
					$val = format_number($table_status[$key]);
					if ($val >= 0) {
						json_row("$key-$name", ($key == "Rows" && $val && $table_status["Engine"] == (JUSH == "pgsql" ? "table" : "InnoDB")
							? "~ $val"
							: $val
						));
					}
					if (isset($sums[$key])) {
						// ignore innodb_file_per_table because it is not active for tables created before it was enabled
						$sums[$key] += ($table_status["Engine"] != "InnoDB" || $key != "Data_free" ? $table_status[$key] : 0);
					}
				} elseif (array_key_exists($key, $table_status)) {
					json_row("$key-$name", "?");
				}
			}
		}
	}
	foreach ($sums as $key => $val) {
		json_row("sum-$key", format_number($val));
	}
	json_row("");

} elseif ($_GET["script"] == "kill") {
	connection()->query("KILL " . number($_POST["kill"]));

} else { // connect
	foreach (count_tables(adminer()->databases()) as $db => $val) {
		json_row("tables-$db", $val);
		json_row("size-$db", db_size($db));
	}
	json_row("");
}

exit; // don't print footer

} else {
	
$tables_views = array_merge((array) $_POST["tables"], (array) $_POST["views"]);

if ($tables_views && !$error && !$_POST["search"]) {
	$result = true;
	$message = "";
	if (JUSH == "sql" && $_POST["tables"] && count($_POST["tables"]) > 1 && ($_POST["drop"] || $_POST["truncate"] || $_POST["copy"])) {
		queries("SET foreign_key_checks = 0"); // allows to truncate or drop several tables at once
	}

	if ($_POST["truncate"]) {
		if ($_POST["tables"]) {
			$result = truncate_tables($_POST["tables"]);
		}
		$message = lang(261);
	} elseif ($_POST["move"]) {
		$result = move_tables((array) $_POST["tables"], (array) $_POST["views"], $_POST["target"]);
		$message = lang(262);
	} elseif ($_POST["copy"]) {
		$result = copy_tables((array) $_POST["tables"], (array) $_POST["views"], $_POST["target"]);
		$message = lang(263);
	} elseif ($_POST["drop"]) {
		if ($_POST["views"]) {
			$result = drop_views($_POST["views"]);
		}
		if ($result && $_POST["tables"]) {
			$result = drop_tables($_POST["tables"]);
		}
		$message = lang(264);
	} elseif (JUSH == "sqlite" && $_POST["check"]) {
		foreach ((array) $_POST["tables"] as $table) {
			foreach (get_rows("PRAGMA integrity_check(" . q($table) . ")") as $row) {
				$message .= "<b>" . h($table) . "</b>: " . h($row["integrity_check"]) . "<br>";
			}
		}
	} elseif (JUSH != "sql") {
		$result = (JUSH == "sqlite"
			? queries("VACUUM")
			: apply_queries("VACUUM" . ($_POST["optimize"] ? "" : " ANALYZE"), $_POST["tables"])
		);
		$message = lang(265);
	} elseif (!$_POST["tables"]) {
		$message = lang(11);
	} elseif ($result = queries(($_POST["optimize"] ? "OPTIMIZE" : ($_POST["check"] ? "CHECK" : ($_POST["repair"] ? "REPAIR" : "ANALYZE"))) . " TABLE " . implode(", ", array_map('Adminer\idf_escape', $_POST["tables"])))) {
		while ($row = $result->fetch_assoc()) {
			$message .= "<b>" . h($row["Table"]) . "</b>: " . h($row["Msg_text"]) . "<br>";
		}
	}

	queries_redirect(substr(ME, 0, -1), $message, $result);
}

page_header(($_GET["ns"] == "" ? lang(29) . ": " . h(DB) : lang(266) . ": " . h($_GET["ns"])), $error, true);

if (adminer()->homepage()) {
	if ($_GET["ns"] !== "") {
		echo "<h3 id='tables-views'>" . lang(267) . "</h3>\n";
		$tables_list = tables_list();
		if (!$tables_list) {
			echo "<p class='message'>" . lang(11) . "\n";
		} else {
			echo "<form action='' method='post'>\n";
			if (support("table")) {
				echo "<fieldset><legend>" . lang(268) . " <span id='selected2'></span></legend><div>";
				echo html_select("op", adminer()->operators(), idx($_POST, "op", JUSH == "elastic" ? "should" : "LIKE %%"));
				echo " <input type='search' name='query' value='" . h($_POST["query"]) . "'>";
				echo script("qsl('input').onkeydown = partialArg(bodyKeydown, 'search');", "");
				echo " <input type='submit' name='search' value='" . lang(48) . "'>\n";
				echo "</div></fieldset>\n";
				if ($_POST["search"] && $_POST["query"] != "") {
					$_GET["where"][0]["op"] = $_POST["op"];
					search_tables();
				}
			}
			echo "<div class='scrollable'>\n";
			echo "<table class='nowrap checkable odds'>\n";
			echo script("mixin(qsl('table'), {onclick: tableClick, ondblclick: partialArg(tableClick, true)});");
			echo '<thead><tr class="wrap">';
			echo '<td><input id="check-all" type="checkbox" class="jsonly">' . script("qs('#check-all').onclick = partial(formCheck, /^(tables|views)\[/);", "");
			echo '<th>' . lang(133);
			$columns = array("Engine" => array(lang(269) . doc_link(array('sql' => 'storage-engines.html'))));
			if (collations()) {
				$columns["Collation"] = array(lang(123) . doc_link(array('sql' => 'charset-charsets.html', 'mariadb' => 'supported-character-sets-and-collations/')));
			}
			if (function_exists('Adminer\alter_table')) {
				$columns["Data_length"] = array(lang(270) . doc_link(array('sql' => 'show-table-status.html',  )), "create", lang(36));
			}
			if (support('indexes')) {
				$columns["Index_length"] = array(lang(271) . doc_link(array('sql' => 'show-table-status.html', )), "indexes", lang(136));
			}
			$columns["Data_free"] = array(lang(272) . doc_link(array('sql' => 'show-table-status.html')), "edit", lang(37));
			if (function_exists('Adminer\alter_table')) {
				$columns["Auto_increment"] = array(lang(43) . doc_link(array('sql' => 'example-auto-increment.html', 'mariadb' => 'auto_increment/')), "auto_increment=1&create", lang(36));
			}
			$columns["Rows"] = array(lang(273) . doc_link(array('sql' => 'show-table-status.html',  )), "select", lang(33));
			if (support("comment")) {
				$columns["Comment"] = array(lang(42) . doc_link(array('sql' => 'show-table-status.html', )));
			}
			foreach ($columns as $column) {
				echo "<td>$column[0]";
			}
			echo "</thead>\n";

			$tables = 0;
			foreach ($tables_list as $name => $type) {
				$view = ($type !== null && !preg_match('~table|sequence~i', $type));
				$id = h("Table-" . $name);
				echo '<tr><td>' . checkbox(($view ? "views[]" : "tables[]"), $name, in_array("$name", $tables_views, true), "", "", "", $id); // "$name" to check numeric table names
				echo '<th>' . (support("table") || support("indexes") ? "<a href='" . h(ME) . "table=" . urlencode($name) . "' title='" . lang(34) . "' id='$id'>" . h($name) . '</a>' : h($name));
				if ($view && !preg_match('~materialized~i', $type)) {
					$title = lang(132);
					echo '<td colspan="6">' . (support("view") ? "<a href='" . h(ME) . "view=" . urlencode($name) . "' title='" . lang(35) . "'>$title</a>" : $title);
					echo '<td align="right"><a href="' . h(ME) . "select=" . urlencode($name) . '" title="' . lang(33) . '">?</a>';
				} else {
					foreach ($columns as $key => $column) {
						$id = " id='$key-" . h($name) . "'";
						echo ($column[1]
							? "<td align='right'><a href='" . h(ME . "$column[1]=") . urlencode($name) . "'$id title='$column[2]'>?</a>"
							: "<td id='$key-" . h($name) . "'>"
						);
					}
					$tables++;
				}
				echo "\n";
			}

			echo "<tr><td><th>" . lang(245, count($tables_list));
			echo "<td>" . h(JUSH == "sql" ? get_val("SELECT @@default_storage_engine") : "");
			echo "<td>" . h(db_collation(DB, collations()));
			foreach (array("Data_length", "Index_length", "Data_free") as $key) {
				echo ($columns[$key] ? "<td align='right' id='sum-$key'>" : "");
			}
			echo "\n";

			echo "</table>\n";
			echo script("ajaxSetHtml('" . js_escape(ME) . "script=db');");
			echo "</div>\n";
			if (!information_schema(DB)) {
				$vacuum = "<input type='submit' value='" . lang(274) . "'> " . on_help("'VACUUM'");
				$optimize = "<input type='submit' name='optimize' value='" . lang(275) . "'> " . on_help(JUSH == "sql" ? "'OPTIMIZE TABLE'" : "'VACUUM OPTIMIZE'");
				$print = (JUSH == "sqlite" ? $vacuum . "<input type='submit' name='check' value='" . lang(276) . "'> " . on_help("'PRAGMA integrity_check'")
				: (JUSH == "pgsql" ? $vacuum . $optimize
				: (JUSH == "sql" ? "<input type='submit' value='" . lang(277) . "'> " . on_help("'ANALYZE TABLE'")
					. $optimize
					. "<input type='submit' name='check' value='" . lang(276) . "'> " . on_help("'CHECK TABLE'")
					. "<input type='submit' name='repair' value='" . lang(278) . "'> " . on_help("'REPAIR TABLE'")
				: "")))
				. (function_exists('Adminer\truncate_tables') ? "<input type='submit' name='truncate' value='" . lang(279) . "'> " . on_help(JUSH == "sqlite" ? "'DELETE'" : "'TRUNCATE" . (JUSH == "pgsql" ? "'" : " TABLE'")) . confirm() : "")
				. (function_exists('Adminer\drop_tables') ? "<input type='submit' name='drop' value='" . lang(128) . "'>" . on_help("'DROP TABLE'") . confirm() : "");
				echo ($print ? "<div class='footer'><div>\n<fieldset><legend>" . lang(127) . " <span id='selected'></span></legend><div>$print\n</div></fieldset>\n" : "");

				$databases = (support("scheme") ? adminer()->schemas() : adminer()->databases());
				$script = "";
				if (count($databases) != 1 && JUSH != "sqlite") {
					echo "<fieldset><legend>" . lang(280) . " <span id='selected3'></span></legend><div>";
					$db = (isset($_POST["target"]) ? $_POST["target"] : (support("scheme") ? $_GET["ns"] : DB));
					echo ($databases ? html_select("target", $databases, $db) : '<input name="target" value="' . h($db) . '" autocapitalize="off">');
					echo "</label> <input type='submit' name='move' value='" . lang(281) . "'>";
					echo (support("copy") ? " <input type='submit' name='copy' value='" . lang(282) . "'> " . checkbox("overwrite", 1, $_POST["overwrite"], lang(283)) : "");
					echo "</div></fieldset>\n";
					$script = " selectCount('selected3', formChecked(this, /^(tables|views)\[/));";
				}
				echo "<input type='hidden' name='all' value=''>"; // used by trCheck()
				echo script("qsl('input').onclick = function () { selectCount('selected', formChecked(this, /^(tables|views)\[/));"
					. (support("table") ? " selectCount('selected2', formChecked(this, /^tables\[/) || $tables);" : "")
					. "$script }")
				;
				echo input_token();
				echo "</div></div>\n";
			}
			echo "</form>\n";
			echo script("tableCheck();");
		}

		echo (function_exists('Adminer\alter_table') ? "<p class='links'><a href='" . h(ME) . "create='>" . lang(69) . "</a>\n" : '');
		echo (support("view") ? "<a href='" . h(ME) . "view='>" . lang(207) . "</a>\n" : "");

		if (support("routine")) {
			echo "<h3 id='routines'>" . lang(64) . "</h3>\n";
			$routines = routines();
			if ($routines) {
				echo "<table class='odds'>\n";
				echo '<thead><tr><th>' . lang(188) . '<td>' . lang(41) . '<td>' . lang(224) . "<td></thead>\n";
				foreach ($routines as $row) {
					$name = ($row["SPECIFIC_NAME"] == $row["ROUTINE_NAME"] ? "" : "&name=" . urlencode($row["ROUTINE_NAME"])); // not computed on the pages to be able to print the header first
					echo '<tr>';
					echo '<th><a href="' . h(ME . ($row["ROUTINE_TYPE"] != "PROCEDURE" ? 'callf=' : 'call=') . urlencode($row["SPECIFIC_NAME"]) . $name) . '">' . h($row["ROUTINE_NAME"]) . '</a>';
					echo '<td>' . h($row["ROUTINE_TYPE"]);
					echo '<td>' . h($row["DTD_IDENTIFIER"]);
					echo '<td><a href="' . h(ME . ($row["ROUTINE_TYPE"] != "PROCEDURE" ? 'function=' : 'procedure=') . urlencode($row["SPECIFIC_NAME"]) . $name) . '">' . lang(139) . "</a>";
				}
				echo "</table>\n";
			}
			echo '<p class="links">'
				. (support("procedure") ? '<a href="' . h(ME) . 'procedure=">' . lang(223) . '</a>' : '')
				. '<a href="' . h(ME) . 'function=">' . lang(222) . "</a>\n"
			;
		}





		if (support("event")) {
			echo "<h3 id='events'>" . lang(66) . "</h3>\n";
			$rows = get_rows("SHOW EVENTS");
			if ($rows) {
				echo "<table>\n";
				echo "<thead><tr><th>" . lang(188) . "<td>" . lang(284) . "<td>" . lang(213) . "<td>" . lang(214) . "<td></thead>\n";
				foreach ($rows as $row) {
					echo "<tr>";
					echo "<th>" . h($row["Name"]);
					echo "<td>" . ($row["Execute at"] ? lang(285) . "<td>" . $row["Execute at"] : lang(215) . " " . $row["Interval value"] . " " . $row["Interval field"] . "<td>$row[Starts]");
					echo "<td>$row[Ends]";
					echo '<td><a href="' . h(ME) . 'event=' . urlencode($row["Name"]) . '">' . lang(139) . '</a>';
				}
				echo "</table>\n";
				$event_scheduler = get_val("SELECT @@event_scheduler");
				if ($event_scheduler && $event_scheduler != "ON") {
					echo "<p class='error'><code class='jush-sqlset'>event_scheduler</code>: " . h($event_scheduler) . "\n";
				}
			}
			echo '<p class="links"><a href="' . h(ME) . 'event=">' . lang(212) . "</a>\n";
		}
	}
}

}

// each page calls its own page_header(), if the footer should not be called then the page exits
page_footer();
