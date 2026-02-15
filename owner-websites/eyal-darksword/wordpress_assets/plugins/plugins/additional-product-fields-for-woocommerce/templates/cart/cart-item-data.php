<?php
echo "<div style=\"width: 100%\">";
foreach ( $item_data as $data )
{
    if(isset($data['display']))
        echo $data['display'];

}
echo "</div>";
