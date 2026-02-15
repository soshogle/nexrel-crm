<?php


namespace rednaowooextraproduct\core\Managers\SlateGenerator\Block;


use rednaowooextraproduct\core\Managers\SlateGenerator\Core\NodeElementBase;

class Image extends NodeElementBase
{

    /**
     * @inheritDoc
     */
    public function GetNodeName()
    {
        return 'img';
    }

    public function Process()
    {
        $urlId=$this->GetDataValue('UrlId','');
        $width=$this->GetDataValue('Width','auto');
        $height=$this->GetDataValue('Height','auto');

        $url=\wp_get_attachment_url($urlId);

        if($width!='auto')
        {
            $width.='px';
        }

        if($height!='auto')
        {
            $height.='height';
        }

        if($url==false)
        {
            $this->Node->Remove();
            return;
        }

        $this->Node->SetAttribute('src',$url);
        $this->Node->AddStyles(array('width'=>$width,'height'=>$height));

    }
}