import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

const SettingsPanel = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Settings className="h-6 w-6 text-primary" />
        Настройки
      </h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Настройки приложения</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Раздел для управления настройками.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPanel;
