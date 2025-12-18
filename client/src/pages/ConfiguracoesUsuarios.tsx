import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowLeft, Shield, User, Eye, EyeOff, UserPlus, Trash2, Pencil } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ConfiguracoesUsuarios() {
  const [, setLocation] = useLocation();
  const { data: users, isLoading } = trpc.users.list.useQuery();
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "user" as "user" | "admin",
  });
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "user" as "user" | "admin",
  });

  const createUser = trpc.users.create.useMutation({
    onSuccess: () => {
      toast.success("Usuário criado com sucesso!");
      utils.users.list.invalidate();
      setDialogOpen(false);
      setFormData({ name: "", email: "", password: "", role: "user" });
    },
    onError: (error: any) => {
      toast.error("Erro ao criar usuário: " + error.message);
    },
  });

  const updateUser = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("Usuário atualizado com sucesso!");
      utils.users.list.invalidate();
      setEditDialogOpen(false);
      setEditingUser(null);
      setEditFormData({ name: "", email: "", password: "", role: "user" });
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar usuário: " + error.message);
    },
  });

  const deleteUser = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast.success("Usuário excluído com sucesso!");
      utils.users.list.invalidate();
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir usuário: " + error.message);
    },
  });

  const toggleActive = trpc.users.toggleActive.useMutation({
    onSuccess: () => {
      toast.success("Status do usuário atualizado!");
      utils.users.list.invalidate();
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar status: " + error.message);
    },
  });

  const updatePermissions = trpc.users.updatePermissions.useMutation({
    onSuccess: () => {
      toast.success("Permissões atualizadas com sucesso!");
      utils.users.list.invalidate();
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar permissões: " + error.message);
    },
  });

  const handleTogglePermission = async (
    userId: string,
    permission: string,
    currentValue: boolean
  ) => {
    const user = users?.find(u => u.id === userId);
    if (!user) return;

    await updatePermissions.mutateAsync({
      userId,
      permissions: {
        canViewCostUSD: permission === 'canViewCostUSD' ? !currentValue : user.canViewCostUSD ?? false,
        canViewCostBRL: permission === 'canViewCostBRL' ? !currentValue : user.canViewCostBRL ?? false,
        canViewImportTaxes: permission === 'canViewImportTaxes' ? !currentValue : user.canViewImportTaxes ?? false,
        canEditProducts: permission === 'canEditProducts' ? !currentValue : user.canEditProducts ?? false,
        canEditImportations: permission === 'canEditImportations' ? !currentValue : user.canEditImportations ?? false,
        canManageUsers: permission === 'canManageUsers' ? !currentValue : user.canManageUsers ?? false,
      },
    });
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      toast.error("Preencha todos os campos");
      return;
    }
    createUser.mutate(formData);
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
    });
    setEditDialogOpen(true);
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editFormData.name || !editFormData.email) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    
    const updateData: any = {
      id: editingUser.id,
      name: editFormData.name,
      email: editFormData.email,
      role: editFormData.role,
    };

    // Só incluir senha se foi preenchida
    if (editFormData.password) {
      updateData.password = editFormData.password;
    }

    updateUser.mutate(updateData);
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o usuário "${userName}"?`)) {
      deleteUser.mutate({ id: userId });
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Nunca";
    return new Date(date).toLocaleString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-12 w-96" />
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setLocation("/configuracoes")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Gerenciar Usuários</h1>
              <p className="text-sm text-muted-foreground">
                Controle usuários, permissões e funções do sistema
              </p>
            </div>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreateUser}>
                <DialogHeader>
                  <DialogTitle>Criar Novo Usuário</DialogTitle>
                  <DialogDescription>
                    Preencha os dados para criar um novo usuário no sistema
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome completo"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@exemplo.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                      minLength={6}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Função *</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value: "user" | "admin") => setFormData({ ...formData, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuário</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createUser.isPending}>
                    {createUser.isPending ? "Criando..." : "Criar Usuário"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent>
              <form onSubmit={handleUpdateUser}>
                <DialogHeader>
                  <DialogTitle>Editar Usuário</DialogTitle>
                  <DialogDescription>
                    Atualize os dados do usuário {editingUser?.name}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Nome *</Label>
                    <Input
                      id="edit-name"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      placeholder="Nome completo"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email *</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      placeholder="email@exemplo.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-password">Nova Senha (opcional)</Label>
                    <Input
                      id="edit-password"
                      type="password"
                      value={editFormData.password}
                      onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                      placeholder="Deixe em branco para manter a atual"
                      minLength={6}
                    />
                    <p className="text-xs text-muted-foreground">
                      Mínimo 6 caracteres. Deixe em branco para não alterar.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-role">Função *</Label>
                    <Select
                      value={editFormData.role}
                      onValueChange={(value: "user" | "admin") => setEditFormData({ ...editFormData, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuário</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={updateUser.isPending}>
                    {updateUser.isPending ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="usuarios" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="usuarios">Usuários</TabsTrigger>
            <TabsTrigger value="permissoes">Permissões</TabsTrigger>
            <TabsTrigger value="funcoes">Funções</TabsTrigger>
          </TabsList>

          {/* Tab: Usuários */}
          <TabsContent value="usuarios" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Lista de Usuários</CardTitle>
                <CardDescription>
                  Gerencie todos os usuários cadastrados no sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Último Acesso</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {user.role === "admin" ? (
                              <Shield className="h-4 w-4 text-primary" />
                            ) : (
                              <User className="h-4 w-4 text-muted-foreground" />
                            )}
                            {user.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                            {user.role === "admin" ? "Administrador" : "Usuário"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? "default" : "destructive"}>
                            {user.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(user.lastSignedIn)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleActive.mutate({ id: user.id })}
                            >
                              {user.isActive ? "Desativar" : "Ativar"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditUser(user)}
                              title="Editar usuário"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteUser(user.id, user.name || "")}
                              title="Excluir usuário"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Permissões */}
          <TabsContent value="permissoes" className="space-y-2">
            <Card>
              <CardHeader>
                <CardTitle>Permissões de Usuários</CardTitle>
                <CardDescription>
                  Configure as permissões individuais de cada usuário
                </CardDescription>
              </CardHeader>
            </Card>

            {users?.map((user) => (
              <Card key={user.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        {user.role === "admin" ? (
                          <Shield className="h-4 w-4 text-primary" />
                        ) : (
                          <User className="h-4 w-4 text-muted-foreground" />
                        )}
                        <CardTitle className="text-base">{user.name}</CardTitle>
                      </div>
                      <Badge
                        variant={user.role === "admin" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {user.role === "admin" ? "Administrador" : "Usuário"}
                      </Badge>
                      {!user.isActive && (
                        <Badge variant="destructive" className="text-xs">
                          Inativo
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription className="text-xs">{user.email}</CardDescription>
                </CardHeader>
                
                {user.role !== "admin" ? (
                  <CardContent className="pt-0">
                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Permissões de Visualização */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          Visualização
                        </h4>
                        <div className="space-y-3 pl-6">
                          <div className="flex items-center justify-between">
                            <Label htmlFor={`${user.id}-viewUSD`} className="text-sm cursor-pointer">
                              Custos em USD
                            </Label>
                            <Switch
                              id={`${user.id}-viewUSD`}
                              checked={user.canViewCostUSD ?? false}
                              onCheckedChange={() => handleTogglePermission(user.id, 'canViewCostUSD', user.canViewCostUSD ?? false)}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor={`${user.id}-viewBRL`} className="text-sm cursor-pointer">
                              Custos em BRL
                            </Label>
                            <Switch
                              id={`${user.id}-viewBRL`}
                              checked={user.canViewCostBRL ?? false}
                              onCheckedChange={() => handleTogglePermission(user.id, 'canViewCostBRL', user.canViewCostBRL ?? false)}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor={`${user.id}-viewTaxes`} className="text-sm cursor-pointer">
                              Impostos de Importação
                            </Label>
                            <Switch
                              id={`${user.id}-viewTaxes`}
                              checked={user.canViewImportTaxes ?? false}
                              onCheckedChange={() => handleTogglePermission(user.id, 'canViewImportTaxes', user.canViewImportTaxes ?? false)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Permissões de Edição */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <EyeOff className="h-4 w-4" />
                          Edição
                        </h4>
                        <div className="space-y-3 pl-6">
                          <div className="flex items-center justify-between">
                            <Label htmlFor={`${user.id}-editProducts`} className="text-sm cursor-pointer">
                              Editar Produtos
                            </Label>
                            <Switch
                              id={`${user.id}-editProducts`}
                              checked={user.canEditProducts ?? false}
                              onCheckedChange={() => handleTogglePermission(user.id, 'canEditProducts', user.canEditProducts ?? false)}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor={`${user.id}-editImportations`} className="text-sm cursor-pointer">
                              Editar Importações
                            </Label>
                            <Switch
                              id={`${user.id}-editImportations`}
                              checked={user.canEditImportations ?? false}
                              onCheckedChange={() => handleTogglePermission(user.id, 'canEditImportations', user.canEditImportations ?? false)}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor={`${user.id}-manageUsers`} className="text-sm cursor-pointer">
                              Gerenciar Usuários
                            </Label>
                            <Switch
                              id={`${user.id}-manageUsers`}
                              checked={user.canManageUsers ?? false}
                              onCheckedChange={() => handleTogglePermission(user.id, 'canManageUsers', user.canManageUsers ?? false)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                ) : (
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">
                      Administradores têm acesso total a todas as funcionalidades do sistema.
                    </p>
                  </CardContent>
                )}
              </Card>
            ))}
          </TabsContent>

          {/* Tab: Funções */}
          <TabsContent value="funcoes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Funções do Sistema</CardTitle>
                <CardDescription>
                  Gerencie as funções e seus níveis de acesso
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Shield className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-semibold">Administrador</h3>
                      <p className="text-sm text-muted-foreground">
                        Acesso total ao sistema, incluindo gerenciamento de usuários
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      <span>Visualizar todos os custos e impostos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      <span>Criar e editar produtos e importações</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      <span>Gerenciar usuários e permissões</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      <span>Acessar todas as configurações do sistema</span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold">Usuário</h3>
                      <p className="text-sm text-muted-foreground">
                        Acesso básico com permissões configuráveis
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                      <span>Acesso controlado por permissões individuais</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                      <span>Pode visualizar dados conforme permissões</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                      <span>Pode editar conforme permissões concedidas</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
