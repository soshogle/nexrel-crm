<?php
/*
Plugin Name: Agile Debug
Plugin URI: 
Description: Helps in developing/debugging Wordpress
Author: S. A. Kamran
Version: 1.5
Author URI: http://agilesolutionspk.com
*/

function agile_dbg_all_init(){
	ob_start();
}
function alog($msg='dbg',$x=array(),$f = __FILE__, $l=__LINE__){
	if($x == 'FILTERHOOK'){
		global $wp_filter;
		
		$x = $wp_filter[$msg];
	}
	$y = get_option('_agile_dbg_log',array());
	$z['msg'] = $msg;
	$z['file'] = $f;
	$z['line'] = $l;
	$z['obj'] = $x;
	$y[] = $z;
	
	if ( get_option( '_agile_dbg_log' ) !== false ) {
			// The option already exists, so we just update it.
			update_option('_agile_dbg_log',$y);
		} else {
			// The option hasn't been added yet. We'll add it with $autoload set to 'no'.
			$deprecated = null;
			$autoload = 'no';
			add_option( '_agile_dbg_log', $y, $deprecated, $autoload );
		}
}
function agile_dbg_admin_menu(){
	add_menu_page('Agile Dbg', 'Agile Dbg', 'manage_options', 'agile_dbg', 'agile_dbg_log' );
	add_submenu_page('agile_dbg','Active Hooks', 'Active Hooks', 'manage_options', 'agile_dbg_hooks',  'agile_dbg_hooks');
	add_submenu_page('agile_dbg','Active Filters', 'Active Filters', 'manage_options', 'agile_dbg_filters',  'agile_dbg_filters');
}
function agile_dbg_hooks(){
	global $wp_actions;
	
	echo "<div>";
	echo date('Y-m-d h:i:s')."<br/><ul>";
	foreach ( $wp_actions as $action_key => $action_val ) {
		echo '<li>' . $action_key .'  '.$action_val. '</li>';
    }
	echo "</ul> </div>";
}
function agile_dbg_filters(){
	global $wp_filter;
	
	echo "<div>";
	echo date('Y-m-d h:i:s')."<br/><ul>";
	foreach ( $wp_filter as $filter_key => $filter_val ) {
        echo '<li>' .$filter_key .'  '.count($filter_val). "</li>";
	}
	echo "</ul> </div>";
}
function agile_dbg_log(){
	if(isset($_POST['delete'])){
		delete_option( '_agile_dbg_log' );
	}
	ob_end_clean();
	header("Expires: Mon, 26 Jul 1997 05:00:00 GMT");
	header("Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT");
	header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
	header("Cache-Control: post-check=0, pre-check=0", false);
	header("Pragma: no-cache");
	?>
		<head>
			<title>Agile Debug</title>
			<script type="text/javascript" src="<?php echo plugins_url('js/jquery.min.js', __FILE__);?>"></script>
			<script type="text/javascript" src="<?php echo plugins_url('js/jquery.collapsible.js', __FILE__);?>"></script>
			<link rel="stylesheet" href="<?php echo plugins_url('css/admin.css', __FILE__);?>" type="text/css" />
			<meta name="author" content="S. A. Kamran (AgileSolutionspk.com)">

		</head>
		<div>
			<form name="whocares" method="post" action="">
				<input class="button button-primary" type="submit" name="delete" value="Clear Log"/>
			</form>
		</div>
	<?php
	$y = get_option('_agile_dbg_log',array());
	foreach($y as $x){
		$f = basename($x['file']);
		$line = $x['line'];
		$msg = $x['msg'];
		?>
			<div class="agile_dbg_collapsible"><?php echo $f.'  '.$line.'  '.$msg;?></div>
			<div class="agile_dbg_content">
				File = <?php echo $x['file'];?>
				<pre><?php print_r($x['obj']);?></pre>
			</div>
		<?php
	}
	?>
		
		<script type="text/javascript">
			jQuery(document).ready(function() {
				//collapsible management
				jQuery('.agile_dbg_collapsible').collapsible({
					
				});
			});
		</script>
	<?php
	exit;
}


add_action( 'admin_init', 'agile_dbg_all_init' );
//add_action('init', 'agile_dbg_all_init');
add_action( 'admin_menu', 'agile_dbg_admin_menu' );

?>
