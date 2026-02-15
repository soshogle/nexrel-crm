<?php


namespace rednaowooextraproduct\core\Managers\CartFormatManager;


use rednaowooextraproduct\core\Managers\FileManager\FileManager;
use rednaowooextraproduct\core\Utils\ArrayUtils;

class GoogleMapsAddressFormatter
{
    public $Value;
    public function __construct($value)
    {
        $this->Value=$value;
    }


    public function Format($includeLabel=true)
    {
        $value=$this->Value->Value;
        $html=$this->AddLine($this->Value->Value->Address1Label,'Address1');
        $html.=$this->AddLine($this->Value->Value->Address2Label,'Address2');
        $html.=$this->AddLine($this->Value->Value->CityLabel,'City');
        $html.=$this->AddLine($this->Value->Value->StateLabel,'State');
        $html.=$this->AddLine($this->Value->Value->ZipLabel,'Zip');
        $html.=$this->AddLine($this->Value->Value->CountryLabel,'CountryLong');





        if($value->FileName!='')
        {
            $dir=wp_get_upload_dir();
            $path=$dir['baseurl'].'/rednaowooextraproduct/maps/'.$value->FileName;

            $html.='<img alt="Image not available" src="'.$path.'" style="width:100%;height:100%;border:1px solid #dfdfdf;max-width:200px;max-height:200px;" />';
        }

        if(isset($value->Markers))
        {
            $markers=ArrayUtils::Filter($value->Markers,function($marker){
                return !isset($marker->IsFixed)||$marker->IsFixed==false;
            });
            for($i=0;$i<count($markers);$i++)
            {
                $html.='<div style="marker_"'.$i.'>';
                $html.='<span>'.(count($markers)>1?'#'.($i+1).": ":'').\esc_html($markers[$i]->Address->FormattedAddress).'</span>';
                $html.='</div>';
            }
        }
        return [[
            "name"=>$this->Value->Label,
            'value'=>$html,
            'field'=>$this->Value,
            'key'=>$this->Value->Label,
            'display'=>$html
        ]];
    }

    private function AddLine($label,$property)
    {
        $value=$this->Value->Value;
        if(!isset($value->$property)||$value->$property=='')
            return '';

        $value=$value->$property;
        $section='<div>';
        $section.='<label style="font-weight: bold;">'.esc_html($label).':</label>';
        $section.='<span style="margin-left: 3px;">'.\esc_html($value).'</span>';
        $section.='</div>';
        return $section;
    }



}