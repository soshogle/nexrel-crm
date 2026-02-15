<?php


namespace rednaowooextraproduct\Integration\Fields;


class FileIntegrationField extends IntegrationFieldBase
{
    public $Paths;
    public $Width='200px';
    public $Height='100px';
    public function __construct($order, $lineItem, $entryData)
    {
        parent::__construct($order, $lineItem, $entryData);
        $this->Paths=[];
    }

    public function SetWidth($width)
    {
        $this->Width=$width;
        return $this;
    }

    public function SetHeight($height)
    {
        $this->Height=$height;
        return $this;
    }


    public function AddPath($Path)
    {
        $this->Paths[]=$Path;
    }

    public function ToText()
    {
        $urls=[];
        foreach($this->Paths as $currentPath)
        {
            $urls[]=admin_url( 'admin-ajax.php').'?action=rednaowooextraproduct_getpublicfileupload&path='.\esc_html($currentPath).'&name='.\basename($currentPath);

        }

        return \implode(', ',$urls);
    }

    public function ToHTML()
    {
        $text='<div>';
        foreach($this->Paths as $currentPath)
        {
            if(substr_compare($currentPath, '.png', -strlen('.png')) === 0||substr_compare($currentPath, '.jpeg', -strlen('.jpeg')) === 0||
                substr_compare($currentPath, '.jpg', -strlen('.jpg')) === 0)
                $text.='<img style="width:'.$this->Width.';height:'.$this->Height.'" src="'.\esc_attr__(admin_url( 'admin-ajax.php').'?action=rednaowooextraproduct_getpublicfileupload&path='.$currentPath.'&name='.\basename($currentPath)).'"/>';

            else
                $text.='<a href="'.\esc_attr__(admin_url( 'admin-ajax.php').'?action=rednaowooextraproduct_getpublicfileupload&path='.\esc_attr__($currentPath).'&name='.\basename($currentPath)).'">'.\esc_html(\esc_attr__(admin_url( 'admin-ajax.php').'?action=rednaowooextraproduct_getpublicfileupload&path='.\esc_html($currentPath).'&name='.\basename($currentPath))).'</a>';
        }
        $text.='</div>';

        return $text;
    }


}