<?php


namespace rednaowooextraproduct\core\Managers\SlateGenerator\Block;


use rednaowooextraproduct\core\Managers\SlateGenerator\Core\NodeElementBase;

class Paragraph extends NodeElementBase
{

    /**
     * @inheritDoc
     */
    public function GetNodeName()
    {
        return 'p';
    }

    public function Process()
    {
        $className=$this->GetDataValue('className','');

        if($className=='alignright')
            $this->Node->AddStyle('text-align','right');

        if($className=='aligncenter')
            $this->Node->AddStyle('text-align','center');

        if($className=='alignleft')
            $this->Node->AddStyle('text-align','left');

        parent::Process();
    }
}